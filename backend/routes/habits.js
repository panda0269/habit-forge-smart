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

// PUT /api/habits/:id - Update a habit
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, frequency } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (frequency !== undefined) updateFields.frequency = frequency;

    const updatedHabit = await Habit.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedHabit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.status(200).json(updatedHabit);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Invalid habit id' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/habits/:id - Delete a habit
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedHabit = await Habit.findByIdAndDelete(id);

    if (!deletedHabit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.status(200).json({ message: 'Habit deleted successfully', habit: deletedHabit });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Invalid habit id' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
