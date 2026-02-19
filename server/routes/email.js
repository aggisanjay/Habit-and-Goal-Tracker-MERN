import express from 'express';
import nodemailer from 'nodemailer';

import { protect } from '../middleware/auth.js';
import Goal from '../models/Goal.js';
import Habit from '../models/Habit.js';

const router = express.Router();

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

// ─── Table-based email-safe HTML (no CSS classes, no grid, no flex) ──────────
function buildEmailHtml(data) {
  const {
    senderName, recipientName, habits, activeGoals, completedGoals,
    habitsCompletedToday, avgProgress, topStreaks, message
  } = data;

  const date = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  const progressBar = (pct, color) => {
    const w = Math.min(Math.max(parseInt(pct) || 0, 0), 100);
    const c = color || '#f59e0b';
    return [
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 2px;">',
      '<tr><td style="background-color:#2a2a2a;border-radius:4px;height:8px;line-height:8px;font-size:0;">',
      `<table width="${w}%" cellpadding="0" cellspacing="0" border="0">`,
      `<tr><td style="background-color:${c};border-radius:4px;height:8px;line-height:8px;font-size:0;">&#8203;</td></tr>`,
      '</table>',
      '</td></tr></table>',
    ].join('');
  };

  const streakSection = topStreaks.length === 0 ? '' : [
    '<tr><td style="padding:16px 32px 4px;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
    '<tr><td style="font-size:12px;font-weight:bold;color:#f59e0b;text-transform:uppercase;letter-spacing:2px;',
    'padding-bottom:10px;border-bottom:1px solid #2a2a2a;">TOP STREAKS</td></tr>',
    topStreaks.map(h => [
      '<tr><td style="padding:10px 0;border-bottom:1px solid #1e1e1e;">',
      '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>',
      `<td width="36" style="vertical-align:middle;font-size:20px;padding-right:10px;">${h.icon}</td>`,
      '<td style="vertical-align:middle;">',
      `<div style="font-size:14px;color:#f0f0f0;font-weight:bold;">${h.name}</div>`,
      `<div style="font-size:11px;color:#888888;margin-top:2px;text-transform:capitalize;">${h.category}</div>`,
      '</td>',
      `<td width="100" style="text-align:right;vertical-align:middle;">`,
      `<span style="background-color:#2a1f00;color:#f59e0b;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:bold;">`,
      `${h.streak.current} day streak</span>`,
      '</td></tr></table></td></tr>',
    ].join('')).join(''),
    '</table></td></tr>',
  ].join('');

  const goalsSection = activeGoals.length === 0 ? '' : [
    '<tr><td style="padding:16px 32px 4px;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
    '<tr><td style="font-size:12px;font-weight:bold;color:#f59e0b;text-transform:uppercase;letter-spacing:2px;',
    'padding-bottom:10px;border-bottom:1px solid #2a2a2a;">ACTIVE GOALS</td></tr>',
    activeGoals.map(g => {
      const daysLeft = Math.ceil((new Date(g.targetDate) - new Date()) / 86400000);
      const barColor = g.progress >= 75 ? '#10b981' : g.progress >= 40 ? '#3b82f6' : '#f59e0b';
      const dueLabel = daysLeft < 0 ? 'Overdue' : `${daysLeft} days left`;
      const dueColor = daysLeft < 0 ? '#ef4444' : '#888888';
      return [
        '<tr><td style="padding:12px 0;border-bottom:1px solid #1e1e1e;">',
        '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>',
        `<td width="28" style="vertical-align:top;padding-top:2px;font-size:18px;">${g.icon}</td>`,
        '<td style="padding-left:10px;vertical-align:top;">',
        `<div style="font-size:14px;color:#f0f0f0;font-weight:bold;margin-bottom:6px;">${g.title}</div>`,
        progressBar(g.progress, barColor),
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;">',
        '<tr>',
        `<td style="font-size:11px;color:#888888;">${g.progress}% complete</td>`,
        `<td style="font-size:11px;color:${dueColor};text-align:right;">${dueLabel}</td>`,
        '</tr></table>',
        '</td></tr></table></td></tr>',
      ].join('');
    }).join(''),
    '</table></td></tr>',
  ].join('');

  const messageSection = message ? [
    '<tr><td style="padding:0 32px 16px;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>',
    '<td style="background-color:#1a1a1e;border-left:3px solid #f59e0b;',
    'padding:14px 16px;color:#aaaaaa;font-size:14px;line-height:1.7;font-style:italic;">',
    message,
    '</td></tr></table></td></tr>',
  ].join('') : '';

  return [
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"',
    '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
    '<html xmlns="http://www.w3.org/1999/xhtml">',
    '<head>',
    '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<title>HabitFlow Progress Report</title>',
    '</head>',
    '<body style="margin:0;padding:0;background-color:#0a0a0b;',
    'font-family:Arial,Helvetica,sans-serif;">',

    '<table width="100%" cellpadding="0" cellspacing="0" border="0"',
    ' style="background-color:#0a0a0b;">',
    '<tr><td align="center" style="padding:32px 16px;">',

    // Card
    '<table width="600" cellpadding="0" cellspacing="0" border="0"',
    ' style="max-width:600px;width:100%;background-color:#111113;',
    'border:1px solid #252530;">',

    // Header
    '<tr><td style="background-color:#e08c00;padding:36px 32px;text-align:center;">',
    `<div style="font-size:26px;font-weight:bold;color:#000000;margin-bottom:6px;">`,
    `HabitFlow Progress Report</div>`,
    `<div style="font-size:13px;color:#553300;">`,
    `${date}</div>`,
    '</td></tr>',

    // Greeting
    '<tr><td style="padding:28px 32px 8px;">',
    `<div style="font-size:17px;color:#f0f0f0;font-weight:bold;margin-bottom:6px;">`,
    `Hello ${recipientName || 'there'},</div>`,
    `<div style="font-size:14px;color:#888888;line-height:1.6;">`,
    `Progress update from <strong style="color:#f0f0f0;">${senderName}</strong>.</div>`,
    '</td></tr>',

    // Stats
    '<tr><td style="padding:16px 32px;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>',

    // Stat 1
    '<td width="33%" style="padding:0 4px;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
    '<tr><td style="background-color:#1a1a1e;border:1px solid #252530;',
    'padding:14px 8px;text-align:center;">',
    `<div style="font-size:24px;font-weight:bold;color:#f59e0b;">${habitsCompletedToday}/${habits.length}</div>`,
    '<div style="font-size:10px;color:#666666;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Today</div>',
    '</td></tr></table></td>',

    // Stat 2
    '<td width="33%" style="padding:0 4px;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
    '<tr><td style="background-color:#1a1a1e;border:1px solid #252530;',
    'padding:14px 8px;text-align:center;">',
    `<div style="font-size:24px;font-weight:bold;color:#f59e0b;">${avgProgress}%</div>`,
    '<div style="font-size:10px;color:#666666;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Goals Avg</div>',
    '</td></tr></table></td>',

    // Stat 3
    '<td width="33%" style="padding:0 4px;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
    '<tr><td style="background-color:#1a1a1e;border:1px solid #252530;',
    'padding:14px 8px;text-align:center;">',
    `<div style="font-size:24px;font-weight:bold;color:#10b981;">${completedGoals.length}</div>`,
    '<div style="font-size:10px;color:#666666;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Completed</div>',
    '</td></tr></table></td>',

    '</tr></table></td></tr>',

    messageSection,
    streakSection,
    goalsSection,

    // Footer
    '<tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #252530;">',
    '<div style="font-size:13px;color:#555555;">',
    `Sent via <strong style="color:#f59e0b;">HabitFlow</strong> &middot; Track. Streak. Achieve.</div>`,
    `<div style="font-size:11px;color:#333333;margin-top:6px;">${new Date().toUTCString()}</div>`,
    '</td></tr>',

    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('\n');
}

// ─── Pure ASCII plain text (no emojis, no box-drawing chars = no quoted-printable issues)
function buildPlainText({ senderName, recipientName, habits, activeGoals, completedGoals, habitsCompletedToday, avgProgress, topStreaks, message }) {
  const lines = [
    'HABITFLOW PROGRESS REPORT',
    '==========================================',
    '',
    `Hello ${recipientName || 'there'},`,
    `Progress update from ${senderName}.`,
    '',
    `TODAY:      ${habitsCompletedToday} of ${habits.length} habits completed`,
    `GOALS AVG:  ${avgProgress}%`,
    `COMPLETED:  ${completedGoals.length} goals`,
    '',
  ];

  if (message) {
    lines.push(`"${message}"`, '');
  }

  if (topStreaks.length > 0) {
    lines.push('TOP STREAKS', '------------------------------------------');
    topStreaks.forEach(h => {
      lines.push(`  ${h.name} - ${h.streak.current} day streak (${h.category})`);
    });
    lines.push('');
  }

  if (activeGoals.length > 0) {
    lines.push('ACTIVE GOALS', '------------------------------------------');
    activeGoals.forEach(g => {
      const daysLeft = Math.ceil((new Date(g.targetDate) - new Date()) / 86400000);
      const due = daysLeft < 0 ? 'OVERDUE' : `${daysLeft} days left`;
      lines.push(`  ${g.title}`);
      lines.push(`    Progress: ${g.progress}% | ${due}`);
    });
    lines.push('');
  }

  lines.push('------------------------------------------');
  lines.push('Sent via HabitFlow - Track. Streak. Achieve.');
  lines.push(new Date().toUTCString());

  return lines.join('\r\n');
}

// ─── POST /api/email/progress-report ─────────────────────────────────────────
router.post('/progress-report', protect, async (req, res) => {
  try {
    const { recipientEmail, recipientName, clientName, message } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }

    const [habits, goals] = await Promise.all([
      Habit.find({ user: req.user._id, isArchived: false }),
      Goal.find({ user: req.user._id, isArchived: false }),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const habitsCompletedToday = habits.filter(h =>
      (h.completions || []).some(c => c.date === today)
    ).length;

    const activeGoals = goals.filter(g => g.status === 'in_progress');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const avgProgress = goals.length
      ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
      : 0;

    const topStreaks = habits
      .filter(h => (h.streak?.current || 0) > 0)
      .sort((a, b) => (b.streak?.current || 0) - (a.streak?.current || 0))
      .slice(0, 5);

    const payload = {
      senderName: req.user.name,
      recipientName: recipientName || clientName || '',
      habits,
      activeGoals,
      completedGoals,
      habitsCompletedToday,
      avgProgress,
      topStreaks,
      message: message || '',
    };

    const htmlContent = buildEmailHtml(payload);
    const textContent = buildPlainText(payload);

    const transporter = createTransporter();
    await transporter.verify();

    await transporter.sendMail({
      from: `"HabitFlow" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `HabitFlow Progress Report from ${req.user.name} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      // Provide BOTH parts — email clients pick the best one
      alternatives: [
        {
          contentType: 'text/plain',
          content: textContent,
          encoding: 'utf-8',        // force UTF-8, not quoted-printable
        },
      ],
      html: htmlContent,
      encoding: 'base64',           // force base64 for HTML — no =3D garbage
    });

    res.json({ success: true, message: `Report sent successfully to ${recipientEmail}` });
  } catch (err) {
    console.error('Email send error:', err);
    let msg = err.message;
    if (err.code === 'EAUTH') msg = 'SMTP authentication failed. Check EMAIL_USER and EMAIL_PASS in .env';
    else if (err.code === 'ECONNECTION' || err.code === 'ESOCKET') msg = 'Cannot connect to SMTP server. Check EMAIL_HOST and EMAIL_PORT in .env';
    else if (err.code === 'EENVELOPE') msg = 'Invalid recipient email address';
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
