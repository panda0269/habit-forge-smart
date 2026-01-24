const express = require('express');
const router = express.Router();
const WeeklyReflection = require('../models/WeeklyReflection');
const auth = require('../middleware/auth');

// GET /api/reflections/:weekStart - Get reflection for a specific week
router.get('/:weekStart', auth, async (req, res) => {
  try {
    const { weekStart } = req.params;
    
    const reflection = await WeeklyReflection.findOne({
      userId: req.userId,
      weekStart
    });

    res.json(reflection || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reflections - Create or update a reflection
router.post('/', auth, async (req, res) => {
  try {
    const { weekStart, whatWorked, whatDidntWork, nextWeekFocus } = req.body;

    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required' });
    }

    const reflection = await WeeklyReflection.findOneAndUpdate(
      { userId: req.userId, weekStart },
      {
        userId: req.userId,
        weekStart,
        whatWorked: whatWorked || '',
        whatDidntWork: whatDidntWork || '',
        nextWeekFocus: nextWeekFocus || '',
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json(reflection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reflections - Get all reflections for user
router.get('/', auth, async (req, res) => {
  try {
    const reflections = await WeeklyReflection.find({ userId: req.userId })
      .sort({ weekStart: -1 });
    
    res.json(reflections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
