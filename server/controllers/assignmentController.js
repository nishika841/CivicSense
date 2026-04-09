const supabase = require('../utils/supabase');

exports.listAssignments = async (req, res) => {
  try {
    const { complaintId, status, page = 1, limit = 20 } = req.query;
    let query = supabase.from('assignments').select('*', { count: 'exact' });
    if (complaintId) query = query.eq('complaint_id', complaintId);
    if (status) query = query.eq('status', status);

    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: assignments, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: 'Error fetching assignments', error: error.message });
    }

    // Fetch related complaints and organizations
    const complaintIds = [...new Set((assignments || []).map(a => a.complaint_id))];
    const orgIds = [...new Set((assignments || []).map(a => a.organization_id))];

    let complaintMap = {};
    if (complaintIds.length > 0) {
      const { data } = await supabase.from('complaints').select('id, title, category, status, created_at').in('id', complaintIds);
      (data || []).forEach(c => { complaintMap[c.id] = { _id: c.id, ...c }; });
    }

    let orgMap = {};
    if (orgIds.length > 0) {
      const { data } = await supabase.from('organizations').select('id, name, type, categories, contacts, is_active').in('id', orgIds);
      (data || []).forEach(o => { orgMap[o.id] = { _id: o.id, ...o }; });
    }

    const formatted = (assignments || []).map(a => ({
      _id: a.id,
      id: a.id,
      complaint: complaintMap[a.complaint_id] || a.complaint_id,
      organization: orgMap[a.organization_id] || a.organization_id,
      channel: a.channel,
      status: a.status,
      language: a.language,
      tone: a.tone,
      attempts: a.attempts,
      lastError: a.last_error,
      sentAt: a.sent_at,
      acknowledgedAt: a.acknowledged_at,
      acceptedAt: a.accepted_at,
      createdAt: a.created_at
    }));

    res.status(200).json({
      success: true,
      assignments: formatted,
      totalPages: Math.ceil((count || 0) / Number(limit)),
      currentPage: Number(page),
      total: count || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assignments',
      error: error.message
    });
  }
};

exports.listNotificationLogs = async (req, res) => {
  try {
    const { assignmentId, success, page = 1, limit = 50 } = req.query;
    let query = supabase.from('notification_logs').select('*', { count: 'exact' });
    if (assignmentId) query = query.eq('assignment_id', assignmentId);
    if (success === 'true') query = query.eq('success', true);
    if (success === 'false') query = query.eq('success', false);

    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: logs, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: 'Error fetching notification logs', error: error.message });
    }

    // Fetch assignments with populated complaint and organization
    const assignmentIds = [...new Set((logs || []).map(l => l.assignment_id))];
    let assignmentMap = {};
    if (assignmentIds.length > 0) {
      const { data: assignments } = await supabase.from('assignments').select('*').in('id', assignmentIds);
      const complaintIds = [...new Set((assignments || []).map(a => a.complaint_id))];
      const orgIds = [...new Set((assignments || []).map(a => a.organization_id))];

      let complaintMap = {};
      if (complaintIds.length > 0) {
        const { data } = await supabase.from('complaints').select('id, title, category, status').in('id', complaintIds);
        (data || []).forEach(c => { complaintMap[c.id] = { _id: c.id, ...c }; });
      }
      let orgMap = {};
      if (orgIds.length > 0) {
        const { data } = await supabase.from('organizations').select('id, name, type').in('id', orgIds);
        (data || []).forEach(o => { orgMap[o.id] = { _id: o.id, ...o }; });
      }

      (assignments || []).forEach(a => {
        assignmentMap[a.id] = {
          _id: a.id,
          complaint: complaintMap[a.complaint_id] || a.complaint_id,
          organization: orgMap[a.organization_id] || a.organization_id,
          channel: a.channel,
          status: a.status
        };
      });
    }

    const formatted = (logs || []).map(l => ({
      _id: l.id,
      id: l.id,
      assignment: assignmentMap[l.assignment_id] || l.assignment_id,
      channel: l.channel,
      provider: l.provider,
      to: l.to_address,
      subject: l.subject,
      body: l.body,
      template: l.template,
      success: l.success,
      providerMessageId: l.provider_message_id,
      error: l.error,
      createdAt: l.created_at
    }));

    res.status(200).json({
      success: true,
      logs: formatted,
      totalPages: Math.ceil((count || 0) / Number(limit)),
      currentPage: Number(page),
      total: count || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notification logs',
      error: error.message
    });
  }
};
