const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// GET /api/leaderboard — top reporters with stats and badges
router.get('/', async (req, res) => {
  try {
    // Fetch all complaints with reporter info
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('reporter_id, votes, status, category');

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Aggregate by reporter
    const reporterStats = {};
    (complaints || []).forEach(c => {
      if (!reporterStats[c.reporter_id]) {
        reporterStats[c.reporter_id] = {
          _id: c.reporter_id,
          totalComplaints: 0,
          totalVotes: 0,
          resolvedCount: 0,
          categories: new Set()
        };
      }
      const s = reporterStats[c.reporter_id];
      s.totalComplaints++;
      s.totalVotes += c.votes || 0;
      if (c.status === 'Resolved') s.resolvedCount++;
      s.categories.add(c.category);
    });

    // Sort by totalComplaints desc, take top 20
    const topReporters = Object.values(reporterStats)
      .sort((a, b) => b.totalComplaints - a.totalComplaints)
      .slice(0, 20);

    // Fetch user names
    const reporterIds = topReporters.map(r => r._id);
    let userMap = {};
    if (reporterIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', reporterIds);
      (users || []).forEach(u => { userMap[u.id] = u.name; });
    }

    // Build leaderboard with badges
    const leaderboard = topReporters.map((u, idx) => {
      const categoriesCount = u.categories.size;
      const score = (u.totalComplaints * 10) + (u.totalVotes * 2) + (u.resolvedCount * 5);

      const badges = [];
      if (u.totalComplaints >= 50) badges.push({ name: 'Civic Champion', icon: '🏆', color: 'bg-yellow-100 text-yellow-800' });
      else if (u.totalComplaints >= 20) badges.push({ name: 'Active Reporter', icon: '⭐', color: 'bg-blue-100 text-blue-800' });
      else if (u.totalComplaints >= 5) badges.push({ name: 'Rising Citizen', icon: '🌟', color: 'bg-green-100 text-green-800' });

      if (u.totalVotes >= 100) badges.push({ name: 'Community Voice', icon: '📢', color: 'bg-purple-100 text-purple-800' });
      if (u.resolvedCount >= 10) badges.push({ name: 'Problem Solver', icon: '✅', color: 'bg-emerald-100 text-emerald-800' });
      if (categoriesCount >= 5) badges.push({ name: 'Diverse Reporter', icon: '🎯', color: 'bg-orange-100 text-orange-800' });
      if (idx === 0) badges.push({ name: '#1 Reporter', icon: '👑', color: 'bg-amber-100 text-amber-800' });

      return {
        _id: u._id,
        name: userMap[u._id] || 'Unknown',
        totalComplaints: u.totalComplaints,
        totalVotes: u.totalVotes,
        resolvedCount: u.resolvedCount,
        categoriesCount,
        score,
        badges,
        rank: idx + 1
      };
    });

    // Overall stats
    const totalComplaints = (complaints || []).length;
    const { count: totalUsers } = await supabase.from('users').select('id', { count: 'exact', head: true });
    const totalResolved = (complaints || []).filter(c => c.status === 'Resolved').length;

    res.json({
      success: true,
      leaderboard,
      stats: { totalComplaints, totalUsers: totalUsers || 0, totalResolved }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
