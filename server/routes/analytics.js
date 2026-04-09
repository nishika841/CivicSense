const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getAnalytics);
router.get('/admin', protect, authorize('admin'), getAnalytics);

module.exports = router;
