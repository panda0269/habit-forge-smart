const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const habitsRoutes = require('./routes/habits');
const habitLogsRoutes = require('./routes/habitLogs');
const statsRoutes = require('./routes/stats');
const rewardsRoutes = require('./routes/rewards');
const reflectionsRoutes = require('./routes/reflections');
const leaderboardRoutes = require('./routes/leaderboard');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   CORS CONFIG (FINAL)
========================= */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'https://habit-forge-smart.vercel.app',
  'https://www.habitbuilder.co.in',
  'https://habitbuilder.co.in',
  /^https:\/\/habit-forge-smart-.*\.vercel\.app$/
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server / curl / Postman
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 🔥 REQUIRED FOR PREFLIGHT

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
   ROUTES
========================= */

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/habit-logs', habitLogsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/reflections', reflectionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/ai', aiRoutes);

/* =========================
   HEALTH & ROOT
========================= */

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'HabitForge API running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'HabitForge API',
    version: '1.0.0'
  });
});

/* =========================
   ERROR HANDLING
========================= */

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

/* =========================
   DB + SERVER START
========================= */

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🩺 Health: http://localhost:${PORT}/health`);
  });
});
