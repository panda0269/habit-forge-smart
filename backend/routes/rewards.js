const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const RedeemableReward = require('../models/RedeemableReward');
const UserRedeemedReward = require('../models/UserRedeemedReward');
const auth = require('../middleware/auth');

// XP Constants
const XP_PER_LEVEL = 100;

// Calculate level from XP
const calculateLevel = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;

// GET /api/rewards/user - Get user's rewards data
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    res.json({
      id: user._id,
      userId: user._id,
      xpPoints: user.xpPoints || 0,
      level: user.level || 1,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/rewards/xp - Add XP to user
router.put('/xp', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (typeof amount !== 'number') {
      return res.status(400).json({ error: 'Amount must be a number' });
    }

    const user = await User.findById(req.userId);
    const newXP = (user.xpPoints || 0) + amount;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > (user.level || 1);

    user.xpPoints = newXP;
    user.level = newLevel;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      xpPoints: user.xpPoints,
      level: user.level,
      leveledUp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rewards/achievements - Get all achievements
router.get('/achievements', async (req, res) => {
  try {
    const achievements = await Achievement.find().sort({ requirementValue: 1 });
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rewards/user-achievements - Get user's unlocked achievements
router.get('/user-achievements', auth, async (req, res) => {
  try {
    const userAchievements = await UserAchievement.find({ userId: req.userId })
      .populate('achievementId');
    
    res.json(userAchievements.map(ua => ({
      id: ua._id,
      oderId: ua.userId,
      achievementId: ua.achievementId._id,
      unlockedAt: ua.unlockedAt,
      achievement: ua.achievementId
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rewards/unlock-achievement - Unlock an achievement
router.post('/unlock-achievement', auth, async (req, res) => {
  try {
    const { achievementId } = req.body;

    // Check if already unlocked
    const existing = await UserAchievement.findOne({
      userId: req.userId,
      achievementId
    });

    if (existing) {
      return res.status(400).json({ error: 'Achievement already unlocked' });
    }

    // Get achievement for XP reward
    const achievement = await Achievement.findById(achievementId);
    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    // Unlock achievement
    const userAchievement = new UserAchievement({
      userId: req.userId,
      achievementId
    });
    await userAchievement.save();

    // Add XP reward
    const user = await User.findById(req.userId);
    const newXP = (user.xpPoints || 0) + achievement.xpReward;
    const newLevel = calculateLevel(newXP);
    
    user.xpPoints = newXP;
    user.level = newLevel;
    await user.save();

    res.json({
      userAchievement,
      xpAwarded: achievement.xpReward,
      newXP: user.xpPoints,
      newLevel: user.level
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rewards/redeemable - Get all redeemable rewards
router.get('/redeemable', async (req, res) => {
  try {
    const rewards = await RedeemableReward.find({ isActive: true })
      .sort({ xpCost: 1 });
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rewards/user-redeemed - Get user's redeemed rewards
router.get('/user-redeemed', auth, async (req, res) => {
  try {
    const redeemed = await UserRedeemedReward.find({ userId: req.userId })
      .populate('rewardId');
    
    res.json(redeemed.map(r => ({
      id: r._id,
      userId: r.userId,
      rewardId: r.rewardId._id,
      redeemedAt: r.redeemedAt,
      reward: r.rewardId
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rewards/redeem - Redeem a reward
router.post('/redeem', auth, async (req, res) => {
  try {
    const { rewardId } = req.body;

    // Check if already redeemed
    const existing = await UserRedeemedReward.findOne({
      userId: req.userId,
      rewardId
    });

    if (existing) {
      return res.status(400).json({ error: 'Reward already redeemed' });
    }

    // Get reward for XP cost
    const reward = await RedeemableReward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    // Check if user has enough XP
    const user = await User.findById(req.userId);
    if ((user.xpPoints || 0) < reward.xpCost) {
      return res.status(400).json({ error: 'Not enough XP' });
    }

    // Deduct XP
    user.xpPoints = (user.xpPoints || 0) - reward.xpCost;
    await user.save();

    // Record redemption
    const userRedeemed = new UserRedeemedReward({
      userId: req.userId,
      rewardId
    });
    await userRedeemed.save();

    res.json({
      userRedeemed,
      newXP: user.xpPoints
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
