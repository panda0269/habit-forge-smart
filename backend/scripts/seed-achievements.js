/**
 * Seed script for achievements and redeemable rewards
 * Run: node scripts/seed-achievements.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Achievement = require('../models/Achievement');
const RedeemableReward = require('../models/RedeemableReward');

const achievements = [
  // Streak achievements
  { name: 'First Steps', description: 'Complete your first habit', icon: '🎯', requirementType: 'completions', requirementValue: 1, xpReward: 10 },
  { name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', requirementType: 'streak', requirementValue: 7, xpReward: 50 },
  { name: 'Two Week Champion', description: 'Maintain a 14-day streak', icon: '⚡', requirementType: 'streak', requirementValue: 14, xpReward: 100 },
  { name: 'Month Master', description: 'Maintain a 30-day streak', icon: '🏆', requirementType: 'streak', requirementValue: 30, xpReward: 250 },
  { name: 'Habit Hero', description: 'Maintain a 60-day streak', icon: '👑', requirementType: 'streak', requirementValue: 60, xpReward: 500 },
  { name: 'Century Club', description: 'Maintain a 100-day streak', icon: '💎', requirementType: 'streak', requirementValue: 100, xpReward: 1000 },
  
  // Completion achievements
  { name: 'Getting Started', description: 'Complete 10 habits', icon: '✨', requirementType: 'completions', requirementValue: 10, xpReward: 25 },
  { name: 'Building Momentum', description: 'Complete 50 habits', icon: '🚀', requirementType: 'completions', requirementValue: 50, xpReward: 75 },
  { name: 'Habit Crusher', description: 'Complete 100 habits', icon: '💪', requirementType: 'completions', requirementValue: 100, xpReward: 150 },
  { name: 'Consistency King', description: 'Complete 250 habits', icon: '👊', requirementType: 'completions', requirementValue: 250, xpReward: 300 },
  { name: 'Unstoppable', description: 'Complete 500 habits', icon: '🌟', requirementType: 'completions', requirementValue: 500, xpReward: 500 },
  
  // Habit creation achievements
  { name: 'First Habit', description: 'Create your first habit', icon: '📝', requirementType: 'habits_created', requirementValue: 1, xpReward: 10 },
  { name: 'Habit Collector', description: 'Create 5 habits', icon: '📚', requirementType: 'habits_created', requirementValue: 5, xpReward: 50 },
  { name: 'Lifestyle Designer', description: 'Create 10 habits', icon: '🎨', requirementType: 'habits_created', requirementValue: 10, xpReward: 100 },
  
  // Days active achievements
  { name: 'Week Active', description: 'Be active for 7 days', icon: '📅', requirementType: 'days_active', requirementValue: 7, xpReward: 30 },
  { name: 'Month Active', description: 'Be active for 30 days', icon: '🗓️', requirementType: 'days_active', requirementValue: 30, xpReward: 100 },
  { name: 'Quarter Active', description: 'Be active for 90 days', icon: '📆', requirementType: 'days_active', requirementValue: 90, xpReward: 300 },
];

const redeemableRewards = [
  // Badges
  { name: 'Early Bird', description: 'Show everyone you start your day right', icon: '🌅', xpCost: 50, rewardType: 'badge' },
  { name: 'Night Owl', description: 'For those who crush it after dark', icon: '🦉', xpCost: 50, rewardType: 'badge' },
  { name: 'Zen Master', description: 'Display your mindfulness journey', icon: '🧘', xpCost: 100, rewardType: 'badge' },
  { name: 'Fitness Fanatic', description: 'Show off your dedication to health', icon: '💪', xpCost: 100, rewardType: 'badge' },
  { name: 'Scholar', description: 'Learning is your superpower', icon: '📖', xpCost: 100, rewardType: 'badge' },
  
  // Titles
  { name: 'Habit Apprentice', description: 'A title for beginners', icon: '🎓', xpCost: 150, rewardType: 'title' },
  { name: 'Habit Master', description: 'For the dedicated habit builder', icon: '🎖️', xpCost: 300, rewardType: 'title' },
  { name: 'Habit Legend', description: 'The ultimate achievement', icon: '👑', xpCost: 500, rewardType: 'title' },
  
  // Boosts
  { name: 'Double XP (24h)', description: 'Earn double XP for 24 hours', icon: '⚡', xpCost: 200, rewardType: 'boost' },
  { name: 'Streak Shield', description: 'Protect your streak from one missed day', icon: '🛡️', xpCost: 250, rewardType: 'boost' },
  
  // Themes
  { name: 'Dark Mode Pro', description: 'Unlock premium dark theme variations', icon: '🌙', xpCost: 300, rewardType: 'theme' },
  { name: 'Nature Theme', description: 'Calming nature-inspired colors', icon: '🌿', xpCost: 300, rewardType: 'theme' },
  { name: 'Ocean Theme', description: 'Cool blue ocean vibes', icon: '🌊', xpCost: 300, rewardType: 'theme' },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!');

  // Seed achievements
  console.log('\nSeeding achievements...');
  for (const achievement of achievements) {
    const existing = await Achievement.findOne({ name: achievement.name });
    if (!existing) {
      await Achievement.create(achievement);
      console.log(`  ✓ Created: ${achievement.name}`);
    } else {
      console.log(`  - Exists: ${achievement.name}`);
    }
  }

  // Seed redeemable rewards
  console.log('\nSeeding redeemable rewards...');
  for (const reward of redeemableRewards) {
    const existing = await RedeemableReward.findOne({ name: reward.name });
    if (!existing) {
      await RedeemableReward.create(reward);
      console.log(`  ✓ Created: ${reward.name}`);
    } else {
      console.log(`  - Exists: ${reward.name}`);
    }
  }

  console.log('\nSeeding complete!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
