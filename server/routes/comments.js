const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { protect } = require('../middleware/auth');

// GET /api/comments/:complaintId — get all comments for a complaint
router.get('/:complaintId', async (req, res) => {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('complaint_id', req.params.complaintId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Fetch user info for all comments
    const userIds = [...new Set((comments || []).map(c => c.user_id))];
    let userMap = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, role')
        .in('id', userIds);
      (users || []).forEach(u => { userMap[u.id] = u; });
    }

    const formatted = (comments || []).map(c => ({
      _id: c.id,
      id: c.id,
      complaint: c.complaint_id,
      user: userMap[c.user_id] || { _id: c.user_id, id: c.user_id },
      text: c.text,
      createdAt: c.created_at
    }));

    res.json({ success: true, comments: formatted, count: formatted.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/comments/:complaintId — add a comment (auth required)
router.post('/:complaintId', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        complaint_id: req.params.complaintId,
        user_id: req.user.id,
        text: text.trim()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Fetch user info
    const { data: user } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', req.user.id)
      .single();

    res.status(201).json({
      success: true,
      comment: {
        _id: comment.id,
        id: comment.id,
        complaint: comment.complaint_id,
        user: user || { _id: req.user.id, id: req.user.id },
        text: comment.text,
        createdAt: comment.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
