import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import User from './models/User.js';
import Habit from './models/Habit.js';
import Goal from './models/Goal.js';

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/habittracker';

const dateStr = (daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const generateCompletions = (days, hitRate = 0.8, skipDays = []) => {
  const completions = [];
  for (let i = days; i >= 0; i--) {
    if (skipDays.includes(i)) continue;
    if (Math.random() < hitRate) {
      completions.push({
        date: dateStr(i),
        completedAt: new Date(Date.now() - i * 86400000),
        note: '',
        value: 1,
      });
    }
  }
  return completions;
};

const calcStreak = (completions) => {
  if (!completions.length) return { current: 0, longest: 0, lastCompletedDate: null };
  const dates = [...new Set(completions.map(c => c.date))].sort().reverse();
  const today = dateStr(0);
  const yesterday = dateStr(1);

  let longest = 0, streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i-1]) - new Date(dates[i])) / 86400000;
    if (diff === 1) { streak++; if (streak > longest) longest = streak; }
    else { if (streak > longest) longest = streak; streak = 1; }
  }
  if (streak > longest) longest = streak;

  let current = 0;
  if (dates[0] === today || dates[0] === yesterday) {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i-1]) - new Date(dates[i])) / 86400000;
      if (diff === 1) current++;
      else break;
    }
  }
  return { current, longest: Math.max(current, longest), lastCompletedDate: dates[0] };
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    await Promise.all([User.deleteMany({}), Habit.deleteMany({}), Goal.deleteMany({})]);
    console.log('Cleared existing data');

    

    const [alex, sam] = await User.create([
      {
        name: 'Alex Rivera',
        email: 'alex@demo.com',
        password: 'password123',
        timezone: 'America/New_York',
        preferences: { theme: 'dark', weekStart: 'monday', emailReminders: true },
        stats: { totalHabitsCompleted: 247, longestStreak: 34, goalsCompleted: 3 },
      },
      {
        name: 'Sam Chen',
        email: 'sam@demo.com',
        password: 'password123',
        timezone: 'America/Los_Angeles',
        preferences: { theme: 'dark', weekStart: 'monday', emailReminders: false },
        stats: { totalHabitsCompleted: 89, longestStreak: 12, goalsCompleted: 1 },
      },
    ]);

    console.log('Created 2 users');

    const alexHabitsData = [
      { name: 'Morning Meditation', description: '10 minutes of mindfulness to start the day', icon: '🧘', color: '#8b5cf6', category: 'mindfulness', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 60, hitRate: 0.88, skipDays: [] },
      { name: 'Run / Jog', description: '30 minutes of cardio — at least 3km', icon: '🏃', color: '#ef4444', category: 'fitness', frequency: { type: 'weekly', daysOfWeek: [1, 3, 5, 6], timesPerWeek: 4 }, completionDays: 60, hitRate: 0.78, skipDays: [2, 5, 8] },
      { name: 'Read 30 Pages', description: 'Non-fiction or technical books only', icon: '📚', color: '#3b82f6', category: 'learning', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 60, hitRate: 0.72, skipDays: [] },
      { name: 'Drink 2L Water', description: 'Stay hydrated throughout the day', icon: '💧', color: '#06b6d4', category: 'health', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 60, hitRate: 0.92, skipDays: [] },
      { name: 'Strength Training', description: 'Full body workout with compound movements', icon: '🏋️', color: '#f97316', category: 'fitness', frequency: { type: 'weekly', daysOfWeek: [1, 3, 5], timesPerWeek: 3 }, completionDays: 60, hitRate: 0.75, skipDays: [10, 15, 20] },
      { name: 'Daily Journaling', description: 'Reflect on wins, challenges, and gratitude', icon: '✏️', color: '#f59e0b', category: 'mindfulness', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 60, hitRate: 0.65, skipDays: [] },
      { name: 'No Social Media before 10am', description: 'Protect morning focus time', icon: '🌙', color: '#10b981', category: 'productivity', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 45, hitRate: 0.7, skipDays: [1, 3, 7, 14] },
      { name: 'Learn Spanish (Duolingo)', description: '15 minutes per day, maintain streak', icon: '🌍', color: '#84cc16', category: 'learning', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 30, hitRate: 0.93, skipDays: [] },
      { name: 'Eat Vegetables', description: 'At least 2 servings of vegetables with meals', icon: '🥗', color: '#10b981', category: 'health', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 60, hitRate: 0.85, skipDays: [] },
      { name: 'Sleep by 11pm', description: 'Consistent sleep schedule for recovery', icon: '🛌', color: '#6366f1', category: 'health', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 60, hitRate: 0.6, skipDays: [5, 12, 19, 26] },
      { name: 'Code Side Project', description: '1 hour on personal projects or open source', icon: '💻', color: '#f59e0b', category: 'productivity', frequency: { type: 'weekly', daysOfWeek: [2, 4, 6, 0], timesPerWeek: 4 }, completionDays: 45, hitRate: 0.68, skipDays: [] },
      { name: 'Call Family / Friends', description: 'Stay connected with the people who matter', icon: '🤝', color: '#ec4899', category: 'social', frequency: { type: 'weekly', daysOfWeek: [0, 6], timesPerWeek: 2 }, completionDays: 60, hitRate: 0.8, skipDays: [] },
    ];

    const alexHabits = [];
    for (const data of alexHabitsData) {
      const completions = generateCompletions(data.completionDays, data.hitRate, data.skipDays);
      const streak = calcStreak(completions);
      const habit = await Habit.create({
        user: alex._id, name: data.name, description: data.description,
        icon: data.icon, color: data.color, category: data.category,
        frequency: data.frequency, completions, streak,
        startDate: dateStr(data.completionDays),
      });
      alexHabits.push(habit);
    }
    console.log(`Created ${alexHabits.length} habits for Alex`);

    await Goal.create([
      {
        user: alex._id,
        title: 'Run a Half Marathon',
        description: 'Train consistently to complete a 21km race by end of Q2.',
        icon: '🏅', color: '#ef4444', category: 'health', priority: 'high',
        status: 'in_progress', progress: 45,
        startDate: dateStr(60), targetDate: dateStr(-60),
        linkedHabits: [alexHabits[1]._id, alexHabits[4]._id],
        subTasks: [
          { title: 'Build base: run 5km without stopping', isCompleted: true, completedAt: new Date(Date.now() - 50*86400000), priority: 'high' },
          { title: 'Complete a 10km run', isCompleted: true, completedAt: new Date(Date.now() - 30*86400000), priority: 'high' },
          { title: 'Run 15km in training', isCompleted: false, priority: 'high' },
          { title: 'Join local running club', isCompleted: false, priority: 'medium' },
          { title: 'Get proper running shoes fitted', isCompleted: true, completedAt: new Date(Date.now() - 55*86400000), priority: 'low' },
          { title: 'Follow 12-week training plan', isCompleted: false, priority: 'high' },
          { title: 'Complete race day registration', isCompleted: false, priority: 'medium' },
        ],
      },
      {
        user: alex._id,
        title: 'Launch Personal Finance Dashboard',
        description: 'Build and ship a React + Node.js app that visualizes personal spending, savings rate, and investment portfolio.',
        icon: '🚀', color: '#f59e0b', category: 'career', priority: 'high',
        status: 'in_progress', progress: 62,
        startDate: dateStr(45), targetDate: dateStr(-30),
        linkedHabits: [alexHabits[10]._id],
        notes: 'Currently blocked on Plaid webhook implementation. May need to simplify for MVP.',
        subTasks: [
          { title: 'Design system and wireframes', isCompleted: true, completedAt: new Date(Date.now() - 40*86400000), priority: 'high' },
          { title: 'Set up Express API with auth', isCompleted: true, completedAt: new Date(Date.now() - 35*86400000), priority: 'high' },
          { title: 'Build budget tracking module', isCompleted: true, completedAt: new Date(Date.now() - 25*86400000), priority: 'high' },
          { title: 'Integrate bank API (Plaid)', isCompleted: true, completedAt: new Date(Date.now() - 15*86400000), priority: 'high' },
          { title: 'Build investment portfolio view', isCompleted: false, priority: 'high' },
          { title: 'Mobile responsive design', isCompleted: true, completedAt: new Date(Date.now() - 5*86400000), priority: 'medium' },
          { title: 'Write tests (>80% coverage)', isCompleted: false, priority: 'medium' },
          { title: 'Deploy to Vercel + Railway', isCompleted: false, priority: 'high' },
        ],
      },
      {
        user: alex._id,
        title: 'Read 24 Books This Year',
        description: 'One book every 2 weeks — mix of technical, biography, and philosophy.',
        icon: '📖', color: '#3b82f6', category: 'education', priority: 'medium',
        status: 'in_progress', progress: 58,
        startDate: dateStr(180), targetDate: dateStr(-185),
        linkedHabits: [alexHabits[2]._id],
        subTasks: [
          { title: 'Atomic Habits — James Clear', isCompleted: true, completedAt: new Date(), priority: 'medium' },
          { title: 'The Lean Startup — Eric Ries', isCompleted: true, completedAt: new Date(), priority: 'medium' },
          { title: 'Deep Work — Cal Newport', isCompleted: true, completedAt: new Date(), priority: 'medium' },
          { title: 'Zero to One — Peter Thiel', isCompleted: true, completedAt: new Date(), priority: 'medium' },
          { title: 'Thinking, Fast and Slow', isCompleted: true, completedAt: new Date(), priority: 'medium' },
          { title: 'The Mom Test — Rob Fitzpatrick', isCompleted: true, completedAt: new Date(), priority: 'medium' },
          { title: 'Flow — Mihaly Csikszentmihalyi', isCompleted: true, completedAt: new Date(), priority: 'medium' },
          { title: 'The Personal MBA', isCompleted: false, priority: 'medium' },
          { title: 'Sapiens — Yuval Noah Harari', isCompleted: false, priority: 'low' },
          { title: 'Building a Second Brain', isCompleted: false, priority: 'medium' },
          { title: 'The Almanack of Naval Ravikant', isCompleted: false, priority: 'medium' },
          { title: 'Range — David Epstein', isCompleted: false, priority: 'low' },
        ],
      },
      {
        user: alex._id,
        title: 'Reach B2 Spanish Proficiency',
        description: 'Consistent daily practice through Duolingo, iTalki tutors, and Spanish podcasts.',
        icon: '🇪🇸', color: '#ec4899', category: 'personal', priority: 'medium',
        status: 'in_progress', progress: 35,
        startDate: dateStr(30), targetDate: dateStr(-335),
        linkedHabits: [alexHabits[7]._id],
        subTasks: [
          { title: 'Complete Duolingo Spanish tree', isCompleted: false, priority: 'high' },
          { title: 'Book first iTalki session', isCompleted: true, completedAt: new Date(Date.now() - 10*86400000), priority: 'medium' },
          { title: 'Watch 1 Spanish Netflix show', isCompleted: true, completedAt: new Date(), priority: 'low' },
          { title: 'Reach 500-word vocabulary', isCompleted: false, priority: 'high' },
          { title: 'Hold 5-minute conversation', isCompleted: false, priority: 'high' },
          { title: 'Pass online B1 test', isCompleted: false, priority: 'medium' },
        ],
      },
      {
        user: alex._id,
        title: 'Emergency Fund: $15,000',
        description: 'Build a 6-month emergency fund by cutting discretionary spending and automating savings.',
        icon: '💰', color: '#10b981', category: 'finance', priority: 'high',
        status: 'in_progress', progress: 73,
        startDate: dateStr(120), targetDate: dateStr(-60),
        subTasks: [
          { title: 'Open high-yield savings account', isCompleted: true, completedAt: new Date(), priority: 'high' },
          { title: 'Set up $500/month auto-transfer', isCompleted: true, completedAt: new Date(), priority: 'high' },
          { title: 'Reach $5,000 milestone', isCompleted: true, completedAt: new Date(), priority: 'medium' },
          { title: 'Reach $10,000 milestone', isCompleted: true, completedAt: new Date(), priority: 'medium' },
          { title: 'Audit and cut 3 subscriptions', isCompleted: true, completedAt: new Date(), priority: 'low' },
          { title: 'Reach $15,000 goal', isCompleted: false, priority: 'high' },
        ],
      },
      {
        user: alex._id,
        title: 'Get AWS Solutions Architect Certified',
        description: 'Pass the SAA-C03 exam to validate cloud architecture skills.',
        icon: '☁️', color: '#f97316', category: 'career', priority: 'high',
        status: 'not_started', progress: 0,
        startDate: dateStr(-7), targetDate: dateStr(-90),
        subTasks: [
          { title: 'Enroll in Adrian Cantrill course', isCompleted: false, priority: 'high' },
          { title: 'Complete EC2 & networking modules', isCompleted: false, priority: 'high' },
          { title: 'Complete S3 & storage modules', isCompleted: false, priority: 'high' },
          { title: 'Complete database services modules', isCompleted: false, priority: 'high' },
          { title: 'Take 3 practice exams (>75%)', isCompleted: false, priority: 'high' },
          { title: 'Schedule exam at testing center', isCompleted: false, priority: 'medium' },
          { title: 'Pass the SAA-C03 exam!', isCompleted: false, priority: 'high' },
        ],
      },
    ]);

    console.log('Created 6 goals for Alex');

    const samHabitsData = [
      { name: 'Morning Walk', description: '20 min walk before breakfast', icon: '☀️', color: '#f59e0b', category: 'health', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 30, hitRate: 0.7, skipDays: [] },
      { name: 'Yoga', description: '30 minutes of yoga flow', icon: '🧘', color: '#8b5cf6', category: 'fitness', frequency: { type: 'weekly', daysOfWeek: [1, 3, 5], timesPerWeek: 3 }, completionDays: 30, hitRate: 0.65, skipDays: [] },
      { name: 'No Coffee after 2pm', description: 'Better sleep quality', icon: '☕', color: '#92400e', category: 'health', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 }, completionDays: 20, hitRate: 0.75, skipDays: [] },
    ];

    for (const data of samHabitsData) {
      const completions = generateCompletions(data.completionDays, data.hitRate, data.skipDays);
      const streak = calcStreak(completions);
      await Habit.create({
        user: sam._id, name: data.name, description: data.description,
        icon: data.icon, color: data.color, category: data.category,
        frequency: data.frequency, completions, streak,
        startDate: dateStr(data.completionDays),
      });
    }
    console.log('Created 3 habits for Sam');

    const alexAllHabits = await Habit.find({ user: alex._id });
    const totalCompleted = alexAllHabits.reduce((s, h) => s + h.completions.length, 0);
    const longestStreak = Math.max(...alexAllHabits.map(h => h.streak.longest));
    await User.findByIdAndUpdate(alex._id, {
      'stats.totalHabitsCompleted': totalCompleted,
      'stats.longestStreak': longestStreak,
    });

    console.log('\nSeed complete!');
    console.log('Login: alex@demo.com / password123');
    console.log('Login: sam@demo.com / password123');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();