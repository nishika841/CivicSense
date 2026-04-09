const supabase = require('../utils/supabase');
const { createAssignmentsForComplaint, sendNotificationsForComplaint } = require('../utils/assignmentService');
const { reportCaseOnChain, userConfirmOnChain, generateHash } = require('../utils/blockchain');

exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, address, city, pincode } = req.body;

    if (!title || !description || !category || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const locationData = typeof location === 'string' ? JSON.parse(location) : location;

    if (!locationData || !Array.isArray(locationData.coordinates)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location format'
      });
    }

    const locationAddress = locationData.address || address || 'Unknown location';

    const imagePaths = req.files ? req.files.map(file => `/uploads/complaints/${file.filename}`) : [];

    const { data: complaint, error } = await supabase
      .from('complaints')
      .insert({
        title,
        description,
        category,
        location_lng: locationData.coordinates[0],
        location_lat: locationData.coordinates[1],
        location_address: locationAddress,
        city: city || null,
        pincode: pincode || null,
        images: imagePaths,
        reporter_id: req.user.id,
        status: 'Reported'
      })
      .select()
      .single();

    if (error) {
      console.error('Create complaint error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating complaint',
        error: error.message
      });
    }

    // Insert initial status history
    await supabase.from('status_history').insert({
      complaint_id: complaint.id,
      status: 'Reported',
      timestamp: new Date().toISOString(),
      updated_by: req.user.id
    });

    // Fetch reporter info
    const { data: reporter } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', req.user.id)
      .single();

    // Build complaint object in the shape the frontend expects
    const complaintResponse = formatComplaintResponse(complaint, reporter);

    // Create assignments in background
    setImmediate(() => {
      createAssignmentsForComplaint(complaintResponse)
        .then(() => sendNotificationsForComplaint(complaintResponse))
        .catch(() => { });
    });

    // Register on blockchain for tamper-proof record
    let blockchainTx = null;
    try {
      const complaintDataForHash = {
        id: complaint.id,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        location: [complaint.location_lng, complaint.location_lat],
        reporter: req.user.id,
        timestamp: complaint.created_at
      };

      const blockchainResult = await reportCaseOnChain(
        complaint.id,
        complaintDataForHash
      );

      if (blockchainResult) {
        await supabase
          .from('complaints')
          .update({
            blockchain_hash: blockchainResult.hash,
            transaction_id: blockchainResult.transactionId,
            block_number: blockchainResult.blockNumber,
            on_chain: true
          })
          .eq('id', complaint.id);

        complaintResponse.blockchainHash = blockchainResult.hash;
        complaintResponse.transactionId = blockchainResult.transactionId;
        complaintResponse.blockNumber = blockchainResult.blockNumber;
        complaintResponse.onChain = true;
        blockchainTx = blockchainResult;

        console.log(`✅ Complaint ${complaint.id} registered on blockchain: ${blockchainResult.transactionId}`);
      }
    } catch (blockchainError) {
      console.error('⚠️ Blockchain registration failed (complaint saved in DB):', blockchainError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully',
      complaint: complaintResponse,
      blockchainTx: blockchainTx || null
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating complaint',
      error: error.message
    });
  }
};

exports.getComplaints = async (req, res) => {
  try {
    const {
      status,
      category,
      city,
      pincode,
      search,
      sortBy = 'created_at',
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Map frontend sort fields to DB columns
    const sortFieldMap = { createdAt: 'created_at', impactScore: 'impact_score' };
    const dbSortBy = sortFieldMap[sortBy] || sortBy;

    let query = supabase.from('complaints').select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (city) query = query.eq('city', city);
    if (pincode) query = query.eq('pincode', pincode);
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(
        `title.ilike.%${s}%,description.ilike.%${s}%,location_address.ilike.%${s}%,city.ilike.%${s}%,pincode.ilike.%${s}%,category.ilike.%${s}%`
      );
    }

    const from = (page - 1) * limit;
    const to = from + Number(limit) - 1;

    query = query.order(dbSortBy, { ascending: order === 'asc' }).range(from, to);

    const { data: complaints, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching complaints',
        error: error.message
      });
    }

    // Fetch reporters for all complaints
    const reporterIds = [...new Set(complaints.map(c => c.reporter_id))];
    const { data: reporters } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', reporterIds);

    const reporterMap = {};
    (reporters || []).forEach(r => { reporterMap[r.id] = r; });

    // Calculate impact scores and format response
    const formattedComplaints = complaints.map(c => {
      const daysPending = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
      c.impact_score = c.votes * (daysPending + 1);
      return formatComplaintResponse(c, reporterMap[c.reporter_id]);
    });

    res.status(200).json({
      success: true,
      complaints: formattedComplaints,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: Number(page),
      total: count || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching complaints',
      error: error.message
    });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const { data: complaint, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Fetch reporter
    const { data: reporter } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', complaint.reporter_id)
      .single();

    // Fetch verifiedBy user
    let verifiedByUser = null;
    if (complaint.verified_by) {
      const { data } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', complaint.verified_by)
        .single();
      verifiedByUser = data;
    }

    // Fetch status history with updatedBy user names
    const { data: statusHistory } = await supabase
      .from('status_history')
      .select('*')
      .eq('complaint_id', complaint.id)
      .order('timestamp', { ascending: true });

    // Fetch updatedBy users from status history
    const updatedByIds = [...new Set((statusHistory || []).map(s => s.updated_by).filter(Boolean))];
    let updatedByMap = {};
    if (updatedByIds.length > 0) {
      const { data: updatedByUsers } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', updatedByIds);
      (updatedByUsers || []).forEach(u => { updatedByMap[u.id] = u; });
    }

    const formattedHistory = (statusHistory || []).map(s => ({
      status: s.status,
      timestamp: s.timestamp,
      updatedBy: updatedByMap[s.updated_by] || s.updated_by
    }));

    const daysPending = Math.floor((Date.now() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60 * 24));
    complaint.impact_score = complaint.votes * (daysPending + 1);

    const complaintResponse = formatComplaintResponse(complaint, reporter);
    complaintResponse.verifiedBy = verifiedByUser;
    complaintResponse.statusHistory = formattedHistory;

    res.status(200).json({
      success: true,
      complaint: complaintResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching complaint',
      error: error.message
    });
  }
};

exports.voteComplaint = async (req, res) => {
  try {
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('id, votes')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('complaint_voters')
      .select('complaint_id')
      .eq('complaint_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    const hasVoted = !!existingVote;
    let newVotes;

    if (hasVoted) {
      // Remove vote
      await supabase
        .from('complaint_voters')
        .delete()
        .eq('complaint_id', req.params.id)
        .eq('user_id', req.user.id);
      newVotes = complaint.votes - 1;
    } else {
      // Add vote
      await supabase
        .from('complaint_voters')
        .insert({ complaint_id: req.params.id, user_id: req.user.id });
      newVotes = complaint.votes + 1;
    }

    // Update vote count and impact score
    const daysPending = Math.floor((Date.now() - new Date(complaint.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
    const impactScore = newVotes * (daysPending + 1);

    await supabase
      .from('complaints')
      .update({ votes: newVotes, impact_score: impactScore })
      .eq('id', req.params.id);

    res.status(200).json({
      success: true,
      message: hasVoted ? 'Vote removed' : 'Vote added',
      votes: newVotes,
      impactScore
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error voting on complaint',
      error: error.message
    });
  }
};

exports.getComplaintsByLocation = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 5000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: 'Please provide longitude and latitude'
      });
    }

    // Fetch all complaints and filter by haversine distance in JS
    // (PostGIS may not be enabled on Supabase free tier)
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('*')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching nearby complaints',
        error: error.message
      });
    }

    const targetLng = parseFloat(lng);
    const targetLat = parseFloat(lat);
    const maxDist = parseInt(maxDistance);

    // Haversine distance calculation
    function haversineDistance(lat1, lon1, lat2, lon2) {
      const R = 6371000; // Earth's radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const nearbyComplaints = complaints.filter(c => {
      const dist = haversineDistance(targetLat, targetLng, c.location_lat, c.location_lng);
      return dist <= maxDist;
    });

    // Fetch reporters
    const reporterIds = [...new Set(nearbyComplaints.map(c => c.reporter_id))];
    let reporterMap = {};
    if (reporterIds.length > 0) {
      const { data: reporters } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', reporterIds);
      (reporters || []).forEach(r => { reporterMap[r.id] = r; });
    }

    const formatted = nearbyComplaints.map(c => formatComplaintResponse(c, reporterMap[c.reporter_id]));

    res.status(200).json({
      success: true,
      complaints: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby complaints',
      error: error.message
    });
  }
};

// ── Reporter confirms admin's resolution ────────────────────
exports.confirmResolution = async (req, res) => {
  try {
    const { data: complaint, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.reporter_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the reporter can confirm resolution' });
    }

    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ success: false, message: 'Complaint must be in Resolved state to confirm' });
    }

    if (complaint.resolution_hash === 'USER_CONFIRMED') {
      return res.status(400).json({ success: false, message: 'Resolution already confirmed' });
    }

    const confirmedAt = new Date().toISOString();

    // DB CHECK constraint blocks 'Confirmed' status, so we use resolution_hash as flag
    await supabase
      .from('complaints')
      .update({ resolution_hash: 'USER_CONFIRMED' })
      .eq('id', req.params.id);

    await supabase.from('status_history').insert({
      complaint_id: req.params.id,
      status: 'Confirmed',
      timestamp: confirmedAt,
      updated_by: req.user.id
    });

    // Record confirmation on blockchain
    let blockchainTx = null;
    try {
      if (complaint.on_chain) {
        const bcResult = await userConfirmOnChain(complaint.id);
        if (bcResult) {
          await supabase
            .from('complaints')
            .update({ resolution_transaction_id: bcResult.transactionId })
            .eq('id', req.params.id);
          blockchainTx = bcResult;
          console.log(`✅ Complaint ${complaint.id} confirmed on blockchain: ${bcResult.transactionId}`);
        }
      }
    } catch (bcErr) {
      console.error('⚠️ Blockchain confirm failed:', bcErr.message);
    }

    const { data: updated } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    const { data: reporter } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', updated.reporter_id)
      .single();

    res.status(200).json({
      success: true,
      message: 'Resolution confirmed by reporter',
      complaint: formatComplaintResponse(updated, reporter),
      blockchainTx
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error confirming resolution', error: error.message });
  }
};

// Helper to format complaint from DB columns to the shape the frontend expects
function formatComplaintResponse(c, reporter) {
  return {
    _id: c.id,
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    city: c.city,
    pincode: c.pincode,
    location: {
      type: 'Point',
      coordinates: [c.location_lng, c.location_lat],
      address: c.location_address
    },
    images: c.images || [],
    status: (c.status === 'Resolved' && c.resolution_hash === 'USER_CONFIRMED') ? 'Confirmed' : c.status,
    reporter: reporter || c.reporter_id,
    votes: c.votes,
    voters: [], // voters are in a separate table now
    impactScore: c.impact_score,
    progressImages: c.progress_images || [],
    resolutionImages: c.resolution_images || [],
    statusHistory: c.statusHistory || [],
    verifiedBy: c.verified_by,
    verifiedAt: c.verified_at,
    resolvedAt: c.resolved_at,
    blockchainHash: c.blockchain_hash,
    transactionId: c.transaction_id,
    blockNumber: c.block_number,
    resolutionHash: c.resolution_hash,
    resolutionTransactionId: c.resolution_transaction_id,
    onChain: c.on_chain,
    createdAt: c.created_at
  };
}

// Export the helper so other controllers can use it
exports.formatComplaintResponse = formatComplaintResponse;
