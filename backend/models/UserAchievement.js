const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  achievementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries and uniqueness
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

module.exports = mongoose.model('UserAchievement', userAchievementSchema);
