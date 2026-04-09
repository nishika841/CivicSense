const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const commentRoutes = require('./routes/comments');
const leaderboardRoutes = require('./routes/leaderboard');
const verificationRoutes = require('./routes/verification');
const { seedOrganizationsIfEmpty } = require('./utils/seedOrganizations');
const orgRoutes = require('./routes/org');
const { initSchema } = require('./utils/initSchema');

const app = express();

// Behind a reverse proxy (Render/Heroku/etc.) you typically want this so rate limiting
// and req.ip work correctly.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Helmet defaults to `Cross-Origin-Resource-Policy: same-origin`, which blocks
// the React app (different origin) from loading images served from `/uploads`.
// Allow cross-origin resource loading for static assets like uploaded photos.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
const allowedOrigins = String(process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const isProd = process.env.NODE_ENV === 'production';
const apiWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const apiMax = Number(process.env.RATE_LIMIT_MAX) || (isProd ? 1000 : 10000);

// Global API limiter (kept permissive). Auth endpoints have their own limiter so
// heavy app usage can't prevent a user from logging in.
const apiLimiter = rateLimit({
  windowMs: apiWindowMs,
  max: apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // When mounted on '/api', req.path starts with '/auth/...'
    return req.path.startsWith('/auth/login') || req.path.startsWith('/auth/register');
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/org', orgRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CivicSense API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

async function startServer() {
  console.log('\n========================================');
  console.log('  🏛️  CivicSense Server Starting...');
  console.log('========================================\n');

  // Step 1: Initialize Supabase schema
  await initSchema();

  // Step 2: Seed default organizations
  await seedOrganizationsIfEmpty();

  // Step 3: Start Express server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log('========================================');
    console.log(`  🚀 Server running on port ${PORT}`);
    console.log('========================================\n');
  });
}

startServer();
