const express = require('express');
const router = express.Router();
const { verifyComplaintIntegrity, getBlockchainProof } = require('../controllers/verificationController');
const { protect } = require('../middleware/auth');

router.get('/:id/verify', verifyComplaintIntegrity);
router.get('/:id/proof', protect, getBlockchainProof);

module.exports = router;
