const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');

// Helper: Calculate longest streak from sorted dates (ascending)
function calculateLongestStreak(sortedDatesAsc) {
  if (sortedDatesAsc.length === 0) return 0;
  
  let longest = 1;
  let current = 1;
  
  for (let i = 1; i < sortedDatesAsc.length; i++) {
    const prevDate = new Date(sortedDatesAsc[i - 1]);
    const currDate = new Date(sortedDatesAsc[i]);
    const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }
  return longest;
}

// GET /api/leaderboard - Get leaderboard data
router.get('/', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Get all users with habits
    const users = await User.find({});
    
    // Aggregate habits by user
    const userHabits = await Habit.aggregate([
      { $group: { _id: '$userId', habitCount: { $sum: 1 }, habitIds: { $push: { $toString: '$_id' } } } }
    ]);

    // Get all logs from last 30 days
    const recentLogs = await HabitLog.find({
      date: { $gte: thirtyDaysAgoStr },
      completed: true
    });

    // Create a map of userId to user data
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), {
        displayName: user.displayName || user.email.split('@')[0],
        avatarUrl: user.avatarUrl
      });
    });

    // Calculate leaderboard stats
    const leaderboard = userHabits
      .filter(uh => userMap.has(uh._id))
      .map(userHabit => {
        const userData = userMap.get(userHabit._id);
        const userLogs = recentLogs.filter(log => userHabit.habitIds.includes(log.habitId));
        const uniqueDates = [...new Set(userLogs.map(log => log.date))];
        const sortedDatesAsc = [...uniqueDates].sort((a, b) => a.localeCompare(b));
        
        const totalCompletions = userLogs.length;
        const bestStreak = calculateLongestStreak(sortedDatesAsc);
        
        // Calculate avg completion rate (completions / (habits * 30 days))
        const maxPossible = userHabit.habitCount * 30;
        const avgCompletionRate = maxPossible > 0 
          ? Math.min(100, Math.round((totalCompletions / maxPossible) * 100))
          : 0;

        return {
          user_id: userHabit._id,
          display_name: userData.displayName,
          avatar_url: userData.avatarUrl,
          total_habits: userHabit.habitCount,
          total_completions: totalCompletions,
          best_streak: bestStreak,
          avg_completion_rate: avgCompletionRate
        };
      });

    // Sort by total completions, then best streak
    leaderboard.sort((a, b) => {
      if (b.total_completions !== a.total_completions) {
        return b.total_completions - a.total_completions;
      }
      return b.best_streak - a.best_streak;
    });

    res.json(leaderboard.slice(0, 50));
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
