const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const authWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 20 : 100);

// Only count failed attempts so successful logins don't consume the budget.
const authLimiter = rateLimit({
	windowMs: authWindowMs,
	max: authMax,
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true,
	message: {
		success: false,
		message: 'Too many login attempts, please try again later.'
	}
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);

module.exports = router;
