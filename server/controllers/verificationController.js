const supabase = require('../utils/supabase');
const { getCaseFromChain, generateHash } = require('../utils/blockchain');
const { formatComplaintResponse } = require('./complaintController');

exports.verifyComplaintIntegrity = async (req, res) => {
  try {
    const { data: complaint, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const { data: reporter } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', complaint.reporter_id)
      .single();

    if (!complaint.on_chain) {
      return res.status(200).json({
        success: true,
        verified: false,
        onChain: false,
        message: 'Complaint not registered on blockchain',
        complaint: formatComplaintResponse(complaint, reporter)
      });
    }

    // Re-hash the current DB data and compare with stored hash
    const complaintDataForHash = {
      id: complaint.id,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      location: [complaint.location_lng, complaint.location_lat],
      reporter: complaint.reporter_id,
      timestamp: complaint.created_at
    };
    const currentHash = generateHash(complaintDataForHash);
    const hashMatch = currentHash === complaint.blockchain_hash;

    // Try reading on-chain state
    let chainData = null;
    try { chainData = await getCaseFromChain(complaint.id); } catch (_) {}

    res.status(200).json({
      success: true,
      verified: hashMatch,
      onChain: !!chainData,
      hashMatch,
      transactionId: complaint.transaction_id,
      blockNumber: complaint.block_number,
      blockchainHash: complaint.blockchain_hash,
      currentHash,
      chainStatus: chainData ? chainData.status : null,
      message: hashMatch
        ? '✅ Complaint data is verified and has not been tampered with.'
        : '⚠️ WARNING: Data may have been tampered with! Hash mismatch detected.',
      complaint: formatComplaintResponse(complaint, reporter)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verifying complaint', error: error.message });
  }
};

exports.getBlockchainProof = async (req, res) => {
  try {
    const { data: complaint, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (!complaint.on_chain) {
      return res.status(404).json({ success: false, message: 'Complaint not registered on blockchain' });
    }

    const { data: reporter } = await supabase.from('users').select('id, name, email').eq('id', complaint.reporter_id).single();

    const { data: statusHistory } = await supabase
      .from('status_history')
      .select('*')
      .eq('complaint_id', complaint.id)
      .order('timestamp', { ascending: true });

    const proof = {
      complaintId: complaint.id,
      title: complaint.title,
      category: complaint.category,
      status: complaint.status,
      reporter: reporter ? reporter.name : 'Unknown',
      createdAt: complaint.created_at,
      blockchain: {
        onChain: complaint.on_chain,
        hash: complaint.blockchain_hash,
        reportTxId: complaint.transaction_id,
        resolveTxId: complaint.resolution_transaction_id || null,
        confirmTxId: complaint.resolution_transaction_id || null,
        blockNumber: complaint.block_number,
        explorerUrl: `https://sepolia.etherscan.io/tx/${complaint.transaction_id}`
      },
      statusHistory: (statusHistory || []).map(s => ({
        status: s.status,
        timestamp: s.timestamp,
        updatedBy: s.updated_by
      }))
    };

    res.status(200).json({ success: true, proof });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching blockchain proof', error: error.message });
  }
};
