import express from 'express';
import { body, validationResult } from 'express-validator';

import Goal from '../models/Goal.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();


// GET /api/goals
router.get('/', protect, async (req, res) => {
  try {
    const { status, category, archived = false } = req.query;
    const query = { user: req.user._id, isArchived: archived === 'true' };
    if (status) query.status = status;
    if (category) query.category = category;

    const goals = await Goal.find(query)
      .populate({ path: 'linkedHabits', select: 'name icon color', match: { _id: { $exists: true } } })
      .sort({ createdAt: -1 });

    // Filter out any null populated refs to avoid crashes
    const safeGoals = goals.map((g) => {
      const obj = g.toObject();
      obj.linkedHabits = (obj.linkedHabits || []).filter(Boolean);
      return obj;
    });

    res.json({ success: true, count: safeGoals.length, goals: safeGoals });
  } catch (err) {
    console.error('Goals GET error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/goals/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id })
      .populate({ path: 'linkedHabits', match: { _id: { $exists: true } } });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    const obj = goal.toObject();
    obj.linkedHabits = (obj.linkedHabits || []).filter(Boolean);
    res.json({ success: true, goal: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/goals
router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Goal title is required'),
    body('startDate').notEmpty().withMessage('Start date required'),
    body('targetDate').notEmpty().withMessage('Target date required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const goal = await Goal.create({ ...req.body, user: req.user._id });
      res.status(201).json({ success: true, goal });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PUT /api/goals/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const { _id, user, __v, createdAt, updatedAt, ...updateData } = req.body;
    Object.assign(goal, updateData);
    await goal.save();

    if (goal.status === 'completed') {
      await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.goalsCompleted': 1 } });
    }

    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/goals/:id/subtasks
router.post('/:id/subtasks', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    // Only allow valid priority values
    const task = {
      title: req.body.title,
      priority: ['low', 'medium', 'high'].includes(req.body.priority) ? req.body.priority : 'medium',
      dueDate: req.body.dueDate || null,
    };
    goal.subTasks.push(task);
    await goal.save();
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/goals/:id/subtasks/:taskId
router.put('/:id/subtasks/:taskId', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const task = goal.subTasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Subtask not found' });

    if (req.body.hasOwnProperty('isCompleted')) {
      task.isCompleted = req.body.isCompleted;
      task.completedAt = req.body.isCompleted ? new Date() : null;
    } else {
      if (req.body.title !== undefined) task.title = req.body.title;
      if (req.body.priority !== undefined && ['low', 'medium', 'high'].includes(req.body.priority)) {
        task.priority = req.body.priority;
      }
    }

    await goal.save();
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/goals/:id/subtasks/:taskId
router.delete('/:id/subtasks/:taskId', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    goal.subTasks = goal.subTasks.filter((t) => t._id.toString() !== req.params.taskId);
    await goal.save();
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
