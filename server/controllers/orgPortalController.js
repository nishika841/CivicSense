const supabase = require('../utils/supabase');
const { formatComplaintResponse } = require('./complaintController');
const { formatOrgResponse } = require('./organizationController');

const ORG_ASSIGNMENT_STATUSES = ['acknowledged', 'accepted', 'in_progress', 'resolved'];

exports.listMyAssignments = async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.status(400).json({
        success: false,
        message: 'Org user is not linked to an organization'
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    let query = supabase
      .from('assignments')
      .select('*', { count: 'exact' })
      .eq('organization_id', req.user.organization);

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
      const { data } = await supabase.from('complaints').select('*').in('id', complaintIds);
      (data || []).forEach(c => { complaintMap[c.id] = formatComplaintResponse(c, null); });
    }

    let orgMap = {};
    if (orgIds.length > 0) {
      const { data } = await supabase.from('organizations').select('id, name, type').in('id', orgIds);
      (data || []).forEach(o => { orgMap[o.id] = o; });
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

async function updateAssignmentStatus(req, res, nextStatus) {
  try {
    if (!req.user.organization) {
      return res.status(400).json({
        success: false,
        message: 'Org user is not linked to an organization'
      });
    }

    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (String(assignment.organization_id) !== String(req.user.organization)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this assignment'
      });
    }

    if (!ORG_ASSIGNMENT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignment status'
      });
    }

    const updates = { status: nextStatus };
    if (nextStatus === 'acknowledged') updates.acknowledged_at = new Date().toISOString();
    if (nextStatus === 'accepted') updates.accepted_at = new Date().toISOString();

    await supabase.from('assignments').update(updates).eq('id', assignment.id);

    // Update complaint status if needed
    const { data: complaint } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', assignment.complaint_id)
      .single();

    if (complaint) {
      if (nextStatus === 'in_progress') {
        await supabase.from('complaints').update({ status: 'InProgress' }).eq('id', complaint.id);
        await supabase.from('status_history').insert({
          complaint_id: complaint.id,
          status: 'InProgress',
          timestamp: new Date().toISOString(),
          updated_by: req.user.id
        });
      }
      if (nextStatus === 'resolved') {
        await supabase.from('complaints').update({ status: 'Resolved', resolved_at: new Date().toISOString() }).eq('id', complaint.id);
        await supabase.from('status_history').insert({
          complaint_id: complaint.id,
          status: 'Resolved',
          timestamp: new Date().toISOString(),
          updated_by: req.user.id
        });
      }
    }

    // Fetch populated assignment
    const { data: updated } = await supabase.from('assignments').select('*').eq('id', assignment.id).single();
    const { data: comp } = await supabase.from('complaints').select('*').eq('id', updated.complaint_id).single();
    const { data: org } = await supabase.from('organizations').select('id, name, type').eq('id', updated.organization_id).single();

    res.status(200).json({
      success: true,
      assignment: {
        _id: updated.id,
        id: updated.id,
        complaint: comp ? formatComplaintResponse(comp, null) : updated.complaint_id,
        organization: org || updated.organization_id,
        channel: updated.channel,
        status: updated.status,
        createdAt: updated.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating assignment',
      error: error.message
    });
  }
}

exports.acknowledgeAssignment = async (req, res) => updateAssignmentStatus(req, res, 'acknowledged');
exports.acceptAssignment = async (req, res) => updateAssignmentStatus(req, res, 'accepted');
exports.setInProgress = async (req, res) => updateAssignmentStatus(req, res, 'in_progress');
exports.setResolved = async (req, res) => updateAssignmentStatus(req, res, 'resolved');

exports.uploadOngoingPhoto = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const { data: assignment } = await supabase
      .from('assignments')
      .select('*')
      .eq('organization_id', req.user.organization)
      .eq('complaint_id', complaintId)
      .single();

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found for this complaint'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const { data: complaint } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single();

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const imagePath = `/uploads/complaints/${req.file.filename}`;

    await supabase.from('assignments').update({ status: 'in_progress' }).eq('id', assignment.id);

    const progressImages = complaint.progress_images || [];
    progressImages.push(imagePath);

    await supabase.from('complaints').update({
      progress_images: progressImages,
      status: 'InProgress'
    }).eq('id', complaintId);

    // Add to status history if not already InProgress
    const { data: lastHistory } = await supabase
      .from('status_history')
      .select('status')
      .eq('complaint_id', complaintId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!lastHistory || lastHistory.status !== 'InProgress') {
      await supabase.from('status_history').insert({
        complaint_id: complaintId,
        status: 'InProgress',
        timestamp: new Date().toISOString(),
        updated_by: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ongoing photo uploaded'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading ongoing photo',
      error: error.message
    });
  }
};

exports.uploadCompletionPhoto = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const confirm = String(req.body.confirm || '').toLowerCase();
    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required to mark as completed'
      });
    }

    const { data: assignment } = await supabase
      .from('assignments')
      .select('*')
      .eq('organization_id', req.user.organization)
      .eq('complaint_id', complaintId)
      .single();

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found for this complaint' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const { data: complaint } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single();

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const imagePath = `/uploads/complaints/${req.file.filename}`;

    await supabase.from('assignments').update({ status: 'resolved' }).eq('id', assignment.id);

    const resolutionImages = complaint.resolution_images || [];
    resolutionImages.push(imagePath);

    await supabase.from('complaints').update({
      resolution_images: resolutionImages,
      status: 'Resolved',
      resolved_at: new Date().toISOString()
    }).eq('id', complaintId);

    const { data: lastHistory } = await supabase
      .from('status_history')
      .select('status')
      .eq('complaint_id', complaintId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!lastHistory || lastHistory.status !== 'Resolved') {
      await supabase.from('status_history').insert({
        complaint_id: complaintId,
        status: 'Resolved',
        timestamp: new Date().toISOString(),
        updated_by: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Completion photo uploaded and complaint marked completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading completion photo',
      error: error.message
    });
  }
};
