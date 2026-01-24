const mongoose = require('mongoose');

const weeklyReflectionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  weekStart: {
    type: String, // YYYY-MM-DD format
    required: true
  },
  whatWorked: {
    type: String,
    default: ''
  },
  whatDidntWork: {
    type: String,
    default: ''
  },
  nextWeekFocus: {
    type: String,
    default: ''
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

// Compound index for efficient queries and uniqueness
weeklyReflectionSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyReflection', weeklyReflectionSchema);
