const supabase = require('./supabase');
const { sendEmail } = require('./notificationService');
const { renderNotification } = require('./messageTemplates');
const { sendSms, sendWhatsapp } = require('./twilioService');

function dedupeOrganizationsByName(orgs) {
  const byName = new Map();
  for (const org of orgs || []) {
    const key = String(org.name || '').trim().toLowerCase();
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, org);
  }
  return Array.from(byName.values());
}

function normalizeText(v) {
  return String(v || '').trim().toLowerCase();
}

function orgMatchesArea(org, complaint) {
  const complaintCity = normalizeText(complaint.city);
  const complaintPincode = normalizeText(complaint.pincode);

  if (!complaintCity && !complaintPincode) return false;

  const orgCities = ((org.coverage || {}).cities || []).map(normalizeText).filter(Boolean);
  const orgPincodes = ((org.coverage || {}).pincodes || []).map(normalizeText).filter(Boolean);

  const cityMatch = complaintCity && orgCities.includes(complaintCity);
  const pincodeMatch = complaintPincode && orgPincodes.includes(complaintPincode);

  return Boolean(cityMatch || pincodeMatch);
}

function orgHasNoCoverage(org) {
  const cities = (org.coverage || {}).cities || [];
  const pincodes = (org.coverage || {}).pincodes || [];
  return (cities.length === 0) && (pincodes.length === 0);
}

async function createAssignmentsForComplaint(complaint) {
  // complaint here is in formatted shape (camelCase) from formatComplaintResponse
  const category = complaint.category;
  const complaintId = complaint._id || complaint.id;

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, contacts, coverage, categories')
    .eq('is_active', true)
    .contains('categories', [category]);

  const uniqueOrgs = dedupeOrganizationsByName(orgs);

  if (!uniqueOrgs || uniqueOrgs.length === 0) return [];

  const areaMatched = uniqueOrgs.filter((o) => orgMatchesArea(o, complaint));
  const noCoverage = uniqueOrgs.filter((o) => orgHasNoCoverage(o));
  const selectedOrgs = areaMatched.length > 0 ? areaMatched : noCoverage.length > 0 ? noCoverage : uniqueOrgs;

  // Check existing assignments
  const { data: existing } = await supabase
    .from('assignments')
    .select('organization_id')
    .eq('complaint_id', complaintId)
    .in('organization_id', selectedOrgs.map(o => o.id));

  const existingSet = new Set((existing || []).map(a => String(a.organization_id)));

  const toCreate = selectedOrgs
    .filter(o => !existingSet.has(String(o.id)))
    .map(o => ({
      complaint_id: complaintId,
      organization_id: o.id,
      channel: 'email',
      status: 'queued'
    }));

  if (toCreate.length === 0) return [];
  const { data } = await supabase.from('assignments').insert(toCreate).select();
  return data || [];
}

async function sendNotificationsForComplaint(complaint) {
  const category = complaint.category;
  const complaintId = complaint._id || complaint.id;

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, contacts, coverage, categories')
    .eq('is_active', true)
    .contains('categories', [category]);

  const uniqueOrgs = dedupeOrganizationsByName(orgs);

  if (!uniqueOrgs || uniqueOrgs.length === 0) return;

  const areaMatched = uniqueOrgs.filter((o) => orgMatchesArea(o, complaint));
  const noCoverage = uniqueOrgs.filter((o) => orgHasNoCoverage(o));
  const selectedOrgs = areaMatched.length > 0 ? areaMatched : noCoverage.length > 0 ? noCoverage : uniqueOrgs;

  for (const org of selectedOrgs) {
    const emailTo = ((org.contacts || {}).emails || []).filter(Boolean)[0];
    const smsTo = ((org.contacts || {}).phones || []).filter(Boolean)[0];
    const whatsappTo = ((org.contacts || {}).whatsappNumbers || []).filter(Boolean)[0];

    const channels = [];
    if (emailTo) channels.push({ channel: 'email', to: emailTo });
    if (smsTo) channels.push({ channel: 'sms', to: smsTo });
    if (whatsappTo) channels.push({ channel: 'whatsapp', to: whatsappTo });

    for (const ch of channels) {
      // Upsert assignment
      const { data: existingAssignment } = await supabase
        .from('assignments')
        .select('*')
        .eq('complaint_id', complaintId)
        .eq('organization_id', org.id)
        .eq('channel', ch.channel)
        .single();

      let assignment;
      if (existingAssignment) {
        assignment = existingAssignment;
      } else {
        const { data: newAssignment } = await supabase
          .from('assignments')
          .insert({
            complaint_id: complaintId,
            organization_id: org.id,
            channel: ch.channel,
            status: 'queued',
            language: 'en',
            tone: 'formal'
          })
          .select()
          .single();
        assignment = newAssignment;
      }

      if (!assignment) continue;

      const { subject, body, templateId } = renderNotification({
        complaint,
        channel: ch.channel,
        language: assignment.language || 'en',
        tone: assignment.tone || 'formal'
      });

      const logBase = {
        assignment_id: assignment.id,
        channel: ch.channel,
        provider: 'none',
        to_address: ch.to,
        subject,
        body,
        template: {
          id: templateId,
          language: assignment.language || 'en',
          tone: assignment.tone || 'formal'
        }
      };

      try {
        // Increment attempts
        await supabase
          .from('assignments')
          .update({ attempts: (assignment.attempts || 0) + 1 })
          .eq('id', assignment.id);

        let result;
        if (ch.channel === 'email') {
          result = await sendEmail({ to: ch.to, subject, text: body });
        } else if (ch.channel === 'sms') {
          result = await sendSms({ to: ch.to, body });
        } else {
          result = await sendWhatsapp({ to: ch.to, body });
        }

        if (result.skipped) {
          await supabase
            .from('assignments')
            .update({ status: 'skipped', last_error: result.reason || '' })
            .eq('id', assignment.id);

          await supabase.from('notification_logs').insert({
            ...logBase,
            success: false,
            error: result.reason || 'skipped'
          });

          continue;
        }

        await supabase
          .from('assignments')
          .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: '' })
          .eq('id', assignment.id);

        await supabase.from('notification_logs').insert({
          ...logBase,
          provider: ch.channel === 'email' ? 'smtp' : 'twilio',
          success: true,
          provider_message_id: result.messageId || ''
        });
      } catch (err) {
        await supabase
          .from('assignments')
          .update({ status: 'failed', last_error: err.message || String(err) })
          .eq('id', assignment.id);

        await supabase.from('notification_logs').insert({
          ...logBase,
          provider: ch.channel === 'email' ? 'smtp' : 'twilio',
          success: false,
          error: err.message || String(err)
        });
      }
    }
  }
}

module.exports = {
  createAssignmentsForComplaint,
  sendNotificationsForComplaint
};
