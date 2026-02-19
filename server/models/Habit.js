import mongoose from 'mongoose';

const CompletionSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  completedAt: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  value: { type: Number, default: 1 }, // measurable habits
});

const HabitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Habit name is required'],
      trim: true,
      maxlength: 100,
    },
    description: { type: String, default: '', maxlength: 500 },
    icon: { type: String, default: '⭐' },
    color: { type: String, default: '#f59e0b' },

    category: {
      type: String,
      enum: [
        'health',
        'fitness',
        'mindfulness',
        'learning',
        'productivity',
        'social',
        'finance',
        'other',
      ],
      default: 'other',
    },

    frequency: {
      type: { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
      timesPerWeek: { type: Number, default: 7 },
    },

    target: {
      type: { type: String, enum: ['boolean', 'count', 'duration'], default: 'boolean' },
      value: { type: Number, default: 1 },
      unit: { type: String, default: '' },
    },

    reminder: {
      enabled: { type: Boolean, default: false },
      time: { type: String, default: '08:00' },
    },

    completions: [CompletionSchema],

    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastCompletedDate: { type: String, default: null },
    },

    isArchived: { type: Boolean, default: false },
    startDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
HabitSchema.index({ user: 1, isArchived: 1 });
HabitSchema.index({ user: 1, 'completions.date': 1 });

// Virtual: completion rate (last 30 days)
HabitSchema.virtual('completionRate').get(function () {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

  const recentCompletions = this.completions.filter(
    (c) => new Date(c.date) >= thirtyDaysAgo
  ).length;

  return Math.round((recentCompletions / 30) * 100);
});

HabitSchema.set('toJSON', { virtuals: true });

const Habit = mongoose.model('Habit', HabitSchema);

export default Habit;
