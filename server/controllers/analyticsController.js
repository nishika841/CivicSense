const supabase = require('../utils/supabase');

exports.getAnalytics = async (req, res) => {
  try {
    const { area } = req.query;

    // Base query builder
    let complaintsQuery = supabase.from('complaints').select('*');
    if (area) {
      complaintsQuery = complaintsQuery.ilike('location_address', `%${area}%`);
    }

    const { data: allComplaints, error: compError } = await complaintsQuery;
    if (compError) {
      return res.status(500).json({ success: false, message: 'Error fetching analytics', error: compError.message });
    }

    const complaints = allComplaints || [];
    const totalComplaints = complaints.length;

    // Total users
    const { count: totalUsers } = await supabase.from('users').select('id', { count: 'exact', head: true });

    // Status distribution
    const statusCounts = {};
    complaints.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCounts).map(([_id, count]) => ({ _id, count }));

    // Category distribution
    const categoryCounts = {};
    complaints.forEach(c => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });
    const categoryDistribution = Object.entries(categoryCounts).map(([_id, count]) => ({ _id, count }));

    // Fetch reporters for top/recent complaints
    const reporterIds = [...new Set(complaints.map(c => c.reporter_id))];
    let reporterMap = {};
    if (reporterIds.length > 0) {
      const { data: reporters } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', reporterIds);
      (reporters || []).forEach(r => { reporterMap[r.id] = r; });
    }

    const { formatComplaintResponse } = require('./complaintController');

    // Top complaints by impact score
    const topComplaints = [...complaints]
      .sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0))
      .slice(0, 10)
      .map(c => formatComplaintResponse(c, reporterMap[c.reporter_id]));

    // Recent complaints
    const recentComplaints = [...complaints]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(c => formatComplaintResponse(c, reporterMap[c.reporter_id]));

    // Hotspot areas
    const hotspotMap = {};
    complaints.forEach(c => {
      const addr = c.location_address || 'Unknown';
      if (!hotspotMap[addr]) {
        hotspotMap[addr] = { count: 0, coordinates: [c.location_lng, c.location_lat] };
      }
      hotspotMap[addr].count++;
    });
    const hotspotAreas = Object.entries(hotspotMap)
      .map(([_id, data]) => ({ _id, count: data.count, coordinates: data.coordinates }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly trends
    const monthlyMap = {};
    complaints.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { _id: { year: d.getFullYear(), month: d.getMonth() + 1 }, count: 0 };
      }
      monthlyMap[key].count++;
    });
    const monthlyTrends = Object.values(monthlyMap)
      .sort((a, b) => b._id.year - a._id.year || b._id.month - a._id.month)
      .slice(0, 12);

    // Resolution stats
    const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;
    const pendingCount = totalComplaints - resolvedCount;

    // Avg resolution time
    const resolvedWithTime = complaints.filter(c => c.status === 'Resolved' && c.resolved_at);
    let avgResolutionDays = 0;
    if (resolvedWithTime.length > 0) {
      const totalDays = resolvedWithTime.reduce((sum, c) => {
        return sum + (new Date(c.resolved_at) - new Date(c.created_at)) / (1000 * 60 * 60 * 24);
      }, 0);
      avgResolutionDays = (totalDays / resolvedWithTime.length).toFixed(1);
    }

    res.status(200).json({
      success: true,
      area: area || null,
      analytics: {
        overview: {
          totalComplaints,
          totalUsers: totalUsers || 0,
          resolvedCount,
          pendingCount,
          resolutionRate: totalComplaints > 0
            ? ((resolvedCount / totalComplaints) * 100).toFixed(2)
            : 0,
          avgResolutionDays
        },
        statusDistribution,
        categoryDistribution,
        topComplaints,
        recentComplaints,
        hotspotAreas,
        monthlyTrends
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};
