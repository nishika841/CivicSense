const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  voteComplaint,
  getComplaintsByLocation,
  confirmResolution
} = require('../controllers/complaintController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', protect, upload.array('images', 5), createComplaint);
router.get('/', getComplaints);
router.get('/nearby', getComplaintsByLocation);
router.get('/:id', getComplaintById);
router.post('/:id/vote', protect, voteComplaint);
router.post('/:id/confirm', protect, confirmResolution);

module.exports = router;
