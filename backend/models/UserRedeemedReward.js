const mongoose = require('mongoose');

const userRedeemedRewardSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  rewardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedeemableReward',
    required: true
  },
  redeemedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries and uniqueness
userRedeemedRewardSchema.index({ userId: 1, rewardId: 1 }, { unique: true });

module.exports = mongoose.model('UserRedeemedReward', userRedeemedRewardSchema);
