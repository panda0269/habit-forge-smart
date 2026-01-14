const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');

// POST /api/habits - Create a new habit
router.post('/', async (req, res) => {
  try {
    const { userId, title, frequency } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: 'userId and title are required' });
    }

    const habit = new Habit({
      userId,
      title,
      frequency: frequency || 'daily'
    });

    const savedHabit = await habit.save();
    res.status(201).json(savedHabit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/habits/:userId - Get all habits for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const habits = await Habit.find({ userId }).sort({ createdAt: -1 });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
