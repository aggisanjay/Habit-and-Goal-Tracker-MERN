import mongoose from 'mongoose';



const SubTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  dueDate: { type: String, default: null },
  // NOTE: only 'low' | 'medium' | 'high' — NOT 'critical'
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  order: { type: Number, default: 0 },
});

const MilestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  targetDate: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  description: { type: String, default: '' },
});

const GoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Goal title is required'], trim: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 1000 },
    icon: { type: String, default: '🎯' },
    color: { type: String, default: '#10b981' },
    category: {
      type: String,
      enum: ['career', 'health', 'finance', 'personal', 'education', 'relationship', 'other'],
      default: 'personal',
    },
    // Goal-level priority CAN be 'critical'
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'],
      default: 'not_started',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startDate: { type: String, required: true },
    targetDate: { type: String, required: true },
    completedAt: { type: Date, default: null },
    subTasks: [SubTaskSchema],
    milestones: [MilestoneSchema],
    linkedHabits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habit' }],
    notes: { type: String, default: '' },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-calculate progress based on subtasks completion
GoalSchema.pre('save', function (next) {
  try {
    if (this.subTasks && this.subTasks.length > 0) {
      const completed = this.subTasks.filter((t) => t.isCompleted).length;
      this.progress = Math.round((completed / this.subTasks.length) * 100);
    }
    if (this.progress === 100 && this.status === 'in_progress') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
    next();
  } catch (err) {
    next(err);
  }
});

GoalSchema.index({ user: 1, status: 1 });


const Goal = mongoose.model('Goal', GoalSchema);

export default Goal;
