const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  category: {
    type: String,
    default: 'other'
  },
  frequency: {
    type: String,
    default: 'daily'
  },
  targetCount: {
    type: Number,
    default: 1
  },
  color: {
    type: String,
    default: '#10B981'
  },
  reminderTime: {
    type: String,
    default: null
  },
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient user queries
habitSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Habit', habitSchema);
