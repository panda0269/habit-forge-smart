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

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'https://habit-forge-smart.vercel.app',
  'https://habit-forge-smart-4iu5w1nec-nishants-projects-e0b7db68.vercel.app',
  /^https:\/\/habit-forge-smart-.*\.vercel\.app$/,
  'https://www.habitbuilder.co.in',
  'https://habitbuilder.co.in'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/habit-logs', habitLogsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/reflections', reflectionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/ai', aiRoutes);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'HabitForge API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'HabitForge API',
    version: '1.0.0',
    documentation: '/api',
    health: '/health'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
});
