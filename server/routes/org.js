const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  listMyAssignments,
  acknowledgeAssignment,
  acceptAssignment,
  setInProgress,
  setResolved,
  uploadOngoingPhoto,
  uploadCompletionPhoto
} = require('../controllers/orgPortalController');

router.use(protect);
router.use(authorize('org_user'));

router.get('/assignments', listMyAssignments);
router.patch('/assignments/:id/acknowledge', acknowledgeAssignment);
router.patch('/assignments/:id/accept', acceptAssignment);
router.patch('/assignments/:id/in-progress', setInProgress);
router.patch('/assignments/:id/resolve', setResolved);

// Officer photo updates (by complaint id)
router.patch('/complaints/:complaintId/ongoing-photo', upload.single('image'), uploadOngoingPhoto);
router.patch('/complaints/:complaintId/completion-photo', upload.single('image'), uploadCompletionPhoto);

module.exports = router;
