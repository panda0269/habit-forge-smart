const mongoose = require('mongoose');

const redeemableRewardSchema = new mongoose.Schema({
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
  xpCost: {
    type: Number,
    required: true
  },
  rewardType: {
    type: String,
    enum: ['badge', 'theme', 'title', 'boost'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RedeemableReward', redeemableRewardSchema);
