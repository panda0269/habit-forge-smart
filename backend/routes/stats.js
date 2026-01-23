const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');

// Helper: Calculate streak from sorted dates (descending)
function calculateCurrentStreak(sortedDatesDesc, today) {
  if (sortedDatesDesc.length === 0) return 0;
  
  // Check if today is completed
  if (sortedDatesDesc[0] !== today) return 0;
  
  let streak = 1;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const prevDate = new Date(sortedDatesDesc[i - 1]);
    const currDate = new Date(sortedDatesDesc[i]);
    const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

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
    // diffDays === 0 means same day, skip
  }
  return longest;
}

// GET /api/stats/:userId - Get comprehensive stats for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ignore test users
    if (userId === 'testuser') {
      return res.json({
        totalHabits: 0,
        totalCompletions: 0,
        completedToday: 0,
        bestStreak: 0,
        avgCompletionRate: 0,
        habitsWithStats: []
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Get all habits for user
    const habits = await Habit.find({ userId }).sort({ createdAt: -1 });
    
    // Get all logs for user
    const allLogs = await HabitLog.find({ userId, completed: true });

    // Calculate stats per habit
    const habitsWithStats = habits.map(habit => {
      const habitLogs = allLogs.filter(log => log.habitId === habit._id.toString());
      const uniqueDates = [...new Set(habitLogs.map(log => log.date))];
      
      // Sort for streak calculation
      const sortedDatesDesc = [...uniqueDates].sort((a, b) => b.localeCompare(a));
      const sortedDatesAsc = [...uniqueDates].sort((a, b) => a.localeCompare(b));
      
      const completedToday = uniqueDates.includes(today);
      const currentStreak = calculateCurrentStreak(sortedDatesDesc, today);
      const longestStreak = calculateLongestStreak(sortedDatesAsc);
      
      // Calculate completion rate based on days since creation
      const createdAt = new Date(habit.createdAt);
      const daysSinceCreation = Math.max(1, Math.ceil((new Date() - createdAt) / (1000 * 60 * 60 * 24)));
      const completionRate = Math.min(100, Math.round((uniqueDates.length / daysSinceCreation) * 100));
      
      return {
        _id: habit._id,
        id: habit._id,
        userId: habit.userId,
        title: habit.title,
        description: habit.description,
        category: habit.category,
        frequency: habit.frequency,
        targetCount: habit.targetCount,
        color: habit.color,
        reminderTime: habit.reminderTime,
        reminderEnabled: habit.reminderEnabled,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
        completedToday,
        currentStreak,
        longestStreak,
        completionRate,
        totalCompletions: uniqueDates.length,
        missedDays: Math.max(0, daysSinceCreation - uniqueDates.length),
        totalDays: daysSinceCreation
      };
    });

    // Calculate overall stats
    const totalHabits = habits.length;
    const totalCompletions = allLogs.length;
    const completedToday = habitsWithStats.filter(h => h.completedToday).length;
    const bestStreak = habitsWithStats.reduce((max, h) => Math.max(max, h.longestStreak), 0);
    const avgCompletionRate = totalHabits > 0 
      ? Math.round(habitsWithStats.reduce((sum, h) => sum + h.completionRate, 0) / totalHabits)
      : 0;

    res.json({
      totalHabits,
      totalCompletions,
      completedToday,
      bestStreak,
      avgCompletionRate,
      habitsWithStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/leaderboard - Get leaderboard data
router.get('/leaderboard/all', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Aggregate habits by user
    const userHabits = await Habit.aggregate([
      { $match: { userId: { $ne: 'testuser' } } },
      { $group: { _id: '$userId', habitCount: { $sum: 1 }, habitIds: { $push: { $toString: '$_id' } } } }
    ]);

    // Get all logs from last 30 days
    const recentLogs = await HabitLog.find({
      date: { $gte: thirtyDaysAgoStr },
      completed: true,
      userId: { $ne: 'testuser' }
    });

    // Calculate leaderboard stats
    const leaderboard = userHabits.map(user => {
      const userLogs = recentLogs.filter(log => user.habitIds.includes(log.habitId));
      const uniqueDates = [...new Set(userLogs.map(log => log.date))];
      const sortedDatesAsc = [...uniqueDates].sort((a, b) => a.localeCompare(b));
      
      const totalCompletions = userLogs.length;
      const bestStreak = calculateLongestStreak(sortedDatesAsc);
      
      // Calculate avg completion rate (completions / (habits * 30 days))
      const maxPossible = user.habitCount * 30;
      const avgCompletionRate = maxPossible > 0 
        ? Math.min(100, Math.round((totalCompletions / maxPossible) * 100))
        : 0;

      return {
        userId: user._id,
        totalHabits: user.habitCount,
        totalCompletions,
        bestStreak,
        avgCompletionRate
      };
    });

    // Sort by total completions, then best streak
    leaderboard.sort((a, b) => {
      if (b.totalCompletions !== a.totalCompletions) {
        return b.totalCompletions - a.totalCompletions;
      }
      return b.bestStreak - a.bestStreak;
    });

    res.json(leaderboard.slice(0, 50));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
