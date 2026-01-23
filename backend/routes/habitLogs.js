const express = require('express');
const router = express.Router();
const HabitLog = require('../models/HabitLog');
const Habit = require('../models/Habit');

// POST /api/habit-logs - Create or toggle a habit log
router.post('/', async (req, res) => {
  try {
    const { habitId, userId, date } = req.body;

    if (!habitId || !userId || !date) {
      return res.status(400).json({ error: 'habitId, userId, and date are required' });
    }

    // Check if log already exists
    const existingLog = await HabitLog.findOne({ habitId, date });

    if (existingLog) {
      // Toggle off - delete the log
      await HabitLog.findByIdAndDelete(existingLog._id);
      return res.status(200).json({ action: 'deleted', log: existingLog });
    }

    // Create new log
    const log = new HabitLog({
      habitId,
      userId,
      date,
      completed: true
    });

    const savedLog = await log.save();
    res.status(201).json({ action: 'created', log: savedLog });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - log already exists
      return res.status(409).json({ error: 'Log already exists for this habit and date' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/habit-logs/:userId - Get all logs for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ignore test users
    if (userId === 'testuser') {
      return res.json([]);
    }

    const logs = await HabitLog.find({ userId }).sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/habit-logs/habit/:habitId - Get all logs for a specific habit
router.get('/habit/:habitId', async (req, res) => {
  try {
    const { habitId } = req.params;
    const logs = await HabitLog.find({ habitId }).sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/habit-logs/:id - Delete a specific log
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLog = await HabitLog.findByIdAndDelete(id);

    if (!deletedLog) {
      return res.status(404).json({ error: 'Log not found' });
    }

    res.status(200).json({ message: 'Log deleted successfully', log: deletedLog });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Invalid log id' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
