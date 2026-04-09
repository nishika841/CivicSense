const supabase = require('../utils/supabase');
const exifParser = require('exif-parser');
const fs = require('fs');
const haversine = require('haversine-distance');
const { adminResolveOnChain } = require('../utils/blockchain');
const { formatComplaintResponse } = require('./complaintController');

const MAX_DISTANCE_METERS = 100; // 100 meters tolerance

exports.verifyComplaint = async (req, res) => {
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

    const { error: updateError } = await supabase
      .from('complaints')
      .update({
        status: 'Verified',
        verified_by: req.user.id,
        verified_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (updateError) {
      return res.status(500).json({ success: false, message: 'Error verifying complaint', error: updateError.message });
    }

    // Add to status history
    await supabase.from('status_history').insert({
      complaint_id: req.params.id,
      status: 'Verified',
      timestamp: new Date().toISOString(),
      updated_by: req.user.id
    });

    // Fetch updated complaint
    const { data: updated } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.status(200).json({
      success: true,
      message: 'Complaint verified successfully',
      complaint: formatComplaintResponse(updated, null)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying complaint',
      error: error.message
    });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Reported', 'Verified', 'InProgress', 'Resolved', 'Confirmed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

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

    await supabase
      .from('complaints')
      .update({ status })
      .eq('id', req.params.id);

    await supabase.from('status_history').insert({
      complaint_id: req.params.id,
      status,
      timestamp: new Date().toISOString(),
      updated_by: req.user.id
    });

    const { data: updated } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      complaint: formatComplaintResponse(updated, null)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
};

exports.resolveComplaint = async (req, res) => {
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

    const resolutionImagePaths = req.files
      ? req.files.map(file => `/uploads/complaints/${file.filename}`)
      : [];

    if (resolutionImagePaths.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one resolution image is required to complete the complaint'
      });
    }

    // Verify image location
    try {
      const imagePath = req.files[0].path;
      const buffer = fs.readFileSync(imagePath);
      const parser = exifParser.create(buffer);
      const exifData = parser.parse();

      if (exifData && exifData.tags && exifData.tags.GPSLatitude && exifData.tags.GPSLongitude) {
        const imageLocation = {
          latitude: exifData.tags.GPSLatitude,
          longitude: exifData.tags.GPSLongitude
        };

        const complaintLocation = {
          latitude: complaint.location_lat,
          longitude: complaint.location_lng
        };

        const distance = haversine(imageLocation, complaintLocation);

        if (distance > MAX_DISTANCE_METERS) {
          return res.status(400).json({
            success: false,
            message: `Image was taken too far from the complaint location. Distance: ${distance.toFixed(2)} meters. Max allowed: ${MAX_DISTANCE_METERS} meters.`
          });
        }
      } else {
        console.log(`Warning: No EXIF GPS data found for resolution image of complaint ${complaint.id}. Skipping location verification.`);
      }
    } catch (exifError) {
      console.error('Error reading EXIF data:', exifError);
    }

    const resolvedAt = new Date().toISOString();

    await supabase
      .from('complaints')
      .update({
        status: 'Resolved',
        resolved_at: resolvedAt,
        resolution_images: resolutionImagePaths
      })
      .eq('id', req.params.id);

    await supabase.from('status_history').insert({
      complaint_id: req.params.id,
      status: 'Resolved',
      timestamp: resolvedAt,
      updated_by: req.user.id
    });

    // Record admin resolution on blockchain
    let blockchainTx = null;
    try {
      if (complaint.on_chain) {
        const bcResult = await adminResolveOnChain(complaint.id);
        if (bcResult) {
          await supabase
            .from('complaints')
            .update({ resolution_transaction_id: bcResult.transactionId })
            .eq('id', req.params.id);
          blockchainTx = bcResult;
          console.log(`✅ Complaint ${complaint.id} resolved on blockchain: ${bcResult.transactionId}`);
        }
      }
    } catch (blockchainError) {
      console.error('⚠️ Blockchain resolution failed:', blockchainError.message);
    }

    const { data: updated } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.status(200).json({
      success: true,
      message: 'Complaint resolved successfully',
      complaint: formatComplaintResponse(updated, null),
      blockchainTx
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resolving complaint',
      error: error.message
    });
  }
};

exports.deleteComplaint = async (req, res) => {
  try {
    const { data: complaint, error } = await supabase
      .from('complaints')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (error || !complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    await supabase.from('complaints').delete().eq('id', req.params.id);

    res.status(200).json({
      success: true,
      message: 'Complaint deleted (marked for anomaly detection)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting complaint',
      error: error.message
    });
  }
};
