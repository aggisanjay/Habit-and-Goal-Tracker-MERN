import express from 'express';
import { body, validationResult } from 'express-validator';

import Habit from '../models/Habit.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();



// ─── Streak calculator ────────────────────────────────────────────────────────
function calculateStreak(completions) {
  if (!completions || completions.length === 0) {
    return { current: 0, longest: 0, lastCompletedDate: null };
  }
  const dates = [...new Set(completions.map((c) => c.date))].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let longest = 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i - 1]) - new Date(dates[i])) / 86400000;
    if (diff === 1) {
      streak++;
      if (streak > longest) longest = streak;
    } else {
      if (streak > longest) longest = streak;
      streak = 1;
    }
  }
  if (streak > longest) longest = streak;

  let current = 0;
  if (dates[0] === today || dates[0] === yesterday) {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i - 1]) - new Date(dates[i])) / 86400000;
      if (diff === 1) current++;
      else break;
    }
  }
  return { current, longest: Math.max(current, longest), lastCompletedDate: dates[0] };
}

// ─── IMPORTANT: specific routes MUST come before /:id ────────────────────────

// GET /api/habits/today
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();
    const habits = await Habit.find({ user: req.user._id, isArchived: false });

    const todayHabits = habits
      .filter((h) => {
        if (h.frequency.type === 'daily') return true;
        if (h.frequency.type === 'weekly') return (h.frequency.daysOfWeek || []).includes(dayOfWeek);
        return true;
      })
      .map((h) => {
        const todayCompletion = h.completions.find((c) => c.date === today);
        return {
          ...h.toJSON(),
          isCompletedToday: !!todayCompletion,
          todayCompletion: todayCompletion || null,
        };
      });

    res.json({ success: true, habits: todayHabits, date: today });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/habits/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id, isArchived: false });
    const today = new Date().toISOString().split('T')[0];

    // Last 30 days
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const completed = habits.filter((h) =>
        (h.completions || []).some((c) => c.date === dateStr)
      ).length;
      last30.push({ date: dateStr, completed, total: habits.length });
    }

    // Per category
    const byCategory = {};
    habits.forEach((h) => {
      if (!byCategory[h.category]) byCategory[h.category] = { count: 0, completions: 0 };
      byCategory[h.category].count++;
      byCategory[h.category].completions += (h.completions || []).length;
    });

    const totalStreaks = habits.reduce((sum, h) => sum + (h.streak?.current || 0), 0);
    const longestStreak = habits.reduce((max, h) => Math.max(max, h.streak?.longest || 0), 0);
    const completedToday = habits.filter((h) =>
      (h.completions || []).some((c) => c.date === today)
    ).length;

    res.json({
      success: true,
      stats: {
        totalHabits: habits.length,
        completedToday,
        totalStreaks,
        longestStreak,
        last30Days: last30,
        byCategory,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/habits/calendar
router.get('/calendar', protect, async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const end = new Date(y, m, 0).toISOString().split('T')[0];

    const habits = await Habit.find({ user: req.user._id, isArchived: false });
    const calendarData = {};

    habits.forEach((h) => {
      (h.completions || [])
        .filter((c) => c.date >= start && c.date <= end)
        .forEach((c) => {
          if (!calendarData[c.date]) calendarData[c.date] = { completed: 0, total: 0, habits: [] };
          calendarData[c.date].completed++;
          calendarData[c.date].habits.push({ id: h._id, name: h.name, icon: h.icon, color: h.color });
        });
    });

    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(dateStr).getDay();
      const dayHabits = habits.filter((h) => {
        if (h.frequency.type === 'daily') return true;
        if (h.frequency.type === 'weekly') return (h.frequency.daysOfWeek || []).includes(dow);
        return true;
      });
      if (!calendarData[dateStr]) calendarData[dateStr] = { completed: 0, total: dayHabits.length, habits: [] };
      else calendarData[dateStr].total = dayHabits.length;
    }

    res.json({ success: true, year: y, month: m, data: calendarData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/habits — list all
router.get('/', protect, async (req, res) => {
  try {
    const { archived = false, category } = req.query;
    const filter = { user: req.user._id, isArchived: archived === 'true' };
    if (category) filter.category = category;
    const habits = await Habit.find(filter).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: habits.length, habits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/habits — create
router.post(
  '/',
  protect,
  [body('name').trim().notEmpty().withMessage('Habit name is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    try {
      const habit = await Habit.create({ ...req.body, user: req.user._id });
      res.status(201).json({ success: true, habit });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PUT /api/habits/:id — update
router.put('/:id', protect, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    const updated = await Habit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, habit: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/habits/:id/complete — toggle completion
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const { date, note, value } = req.body;
    const completionDate = date || new Date().toISOString().split('T')[0];

    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });

    const existingIndex = (habit.completions || []).findIndex((c) => c.date === completionDate);

    if (existingIndex >= 0) {
      habit.completions.splice(existingIndex, 1);
    } else {
      habit.completions.push({ date: completionDate, note: note || '', value: value || 1 });
      await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.totalHabitsCompleted': 1 } });
    }

    const streakData = calculateStreak(habit.completions);
    habit.streak = streakData;

    if (streakData.longest > (req.user.stats?.longestStreak || 0)) {
      await User.findByIdAndUpdate(req.user._id, { 'stats.longestStreak': streakData.longest });
    }

    await habit.save();
    res.json({ success: true, habit, isCompleted: existingIndex < 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/habits/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    res.json({ success: true, message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
