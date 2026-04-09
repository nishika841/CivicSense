const supabase = require('../utils/supabase');

exports.getUserProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, organization_id, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching user profile'
      });
    }

    // Fetch complaints reported by user
    const { data: complaintsReported } = await supabase
      .from('complaints')
      .select('*')
      .eq('reporter_id', req.user.id)
      .order('created_at', { ascending: false });

    // Fetch voted complaints
    const { data: votedRows } = await supabase
      .from('complaint_voters')
      .select('complaint_id')
      .eq('user_id', req.user.id);

    let votedComplaints = [];
    if (votedRows && votedRows.length > 0) {
      const votedIds = votedRows.map(v => v.complaint_id);
      const { data } = await supabase
        .from('complaints')
        .select('*')
        .in('id', votedIds);
      votedComplaints = data || [];
    }

    const { formatComplaintResponse } = require('./complaintController');

    res.status(200).json({
      success: true,
      user: {
        ...user,
        _id: user.id,
        complaintsReported: (complaintsReported || []).map(c => formatComplaintResponse(c, null)),
        votedComplaints: votedComplaints.map(c => formatComplaintResponse(c, null))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({ name, phone })
      .eq('id', req.user.id)
      .select('id, name, email, role, phone, organization_id, created_at')
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error updating user profile',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      user: { ...user, _id: user.id }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user profile',
      error: error.message
    });
  }
};
