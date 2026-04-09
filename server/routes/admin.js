const express = require('express');
const router = express.Router();
const {
  verifyComplaint,
  updateComplaintStatus,
  resolveComplaint,
  deleteComplaint
} = require('../controllers/adminController');
const {
  createOrganization,
  listOrganizations,
  updateOrganization,
  deleteOrganization
} = require('../controllers/organizationController');
const {
  listAssignments,
  listNotificationLogs
} = require('../controllers/assignmentController');
const { createOrgUser } = require('../controllers/orgUserController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);
router.use(authorize('admin'));

router.patch('/:id/verify', verifyComplaint);
router.patch('/:id/status', updateComplaintStatus);
router.patch('/:id/resolve', upload.array('resolutionImages', 5), resolveComplaint);
router.delete('/:id', deleteComplaint);

router.get('/organizations', listOrganizations);
router.post('/organizations', createOrganization);
router.patch('/organizations/:id', updateOrganization);
router.delete('/organizations/:id', deleteOrganization);

router.get('/assignments', listAssignments);
router.get('/notification-logs', listNotificationLogs);

router.post('/org-users', createOrgUser);

module.exports = router;
