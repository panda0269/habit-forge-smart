const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  requirementType: {
    type: String,
    enum: ['streak', 'completions', 'habits_created', 'days_active'],
    required: true
  },
  requirementValue: {
    type: Number,
    required: true
  },
  xpReward: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Achievement', achievementSchema);
