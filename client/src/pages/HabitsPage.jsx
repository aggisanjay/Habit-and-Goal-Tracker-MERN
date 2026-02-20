import React, { useState, useEffect, useCallback } from 'react';
import { habitsAPI } from '../utils/api';
import './HabitsPage.css';

const CATEGORIES = ['all', 'health', 'fitness', 'mindfulness', 'learning', 'productivity', 'social', 'finance', 'other'];
const ICONS = ['⭐', '💪', '🧘', '📚', '💻', '🏃', '💧', '🥗', '🧠', '✏️', '🎯', '🌙', '☀️', '🎵', '🌿', '🏋️', '🚴', '🤝', '💰', '🛌'];
const COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#14b8a6', '#84cc16'];

const defaultForm = {
  name: '', description: '', icon: '⭐', color: '#f59e0b',
  category: 'other', frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 7 },
  reminder: { enabled: false, time: '08:00' }
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function HabitModal({ habit, onClose, onSave }) {
  const [form, setForm] = useState(habit || defaultForm);
  const [loading, setLoading] = useState(false);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleDay = (d) => {
    const days = form.frequency.daysOfWeek.includes(d)
      ? form.frequency.daysOfWeek.filter(x => x !== d)
      : [...form.frequency.daysOfWeek, d];
    setForm(p => ({ ...p, frequency: { ...p.frequency, daysOfWeek: days } }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (habit?._id) {
        const res = await habitsAPI.update(habit._id, form);
        onSave(res.habit);
      } else {
        const res = await habitsAPI.create(form);
        onSave(res.habit);
      }
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2 className="modal-title">{habit?._id ? 'Edit Habit' : 'New Habit'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="icon-color-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Habit Name</label>
                <input className="form-input" placeholder="e.g. Morning Meditation"
                  value={form.name} onChange={e => update('name', e.target.value)} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Icon</label>
                <div className="icon-picker">
                  {ICONS.map(ic => (
                    <button type="button" key={ic} className={`icon-btn ${form.icon === ic ? 'selected' : ''}`}
                      onClick={() => update('icon', ic)}>{ic}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="color-picker">
                  {COLORS.map(c => (
                    <button type="button" key={c} className={`color-btn ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }} onClick={() => update('color', c)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => update('category', e.target.value)}>
                  {CATEGORIES.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select className="form-select" value={form.frequency.type}
                  onChange={e => setForm(p => ({ ...p, frequency: { ...p.frequency, type: e.target.value } }))}>
                  <option value="daily">Every day</option>
                  <option value="weekly">Specific days</option>
                </select>
              </div>
            </div>

            {form.frequency.type === 'weekly' && (
              <div className="form-group">
                <label className="form-label">Days of Week</label>
                <div className="days-picker">
                  {DAYS.map((d, i) => (
                    <button type="button" key={d}
                      className={`day-btn ${form.frequency.daysOfWeek.includes(i) ? 'selected' : ''}`}
                      onClick={() => toggleDay(i)}>{d}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-textarea" rows={2} placeholder="Why this habit matters..."
                value={form.description} onChange={e => update('description', e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : habit?._id ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HabitCard({ habit, onToggle, onEdit, onDelete }) {
  const today = new Date().toISOString().split('T')[0];
  const isDoneToday = habit.completions?.some(c => c.date === today);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(habit._id);
    setToggling(false);
  };

  const completionRate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const recent = (habit.completions || []).filter(c => new Date(c.date) >= d).length;
    return Math.round((recent / 30) * 100);
  })();

  return (
    <div className={`habit-card ${isDoneToday ? 'done' : ''}`} style={{ '--hc': habit.color }}>
      <div className="habit-card-top">
        <div className="habit-card-icon" style={{ background: habit.color + '20' }}>{habit.icon}</div>
        <div className="habit-card-actions">
          <button className="btn btn-ghost btn-icon" onClick={() => onEdit(habit)} title="Edit">✎</button>
          <button className="btn btn-ghost btn-icon" onClick={() => onDelete(habit._id)} title="Delete"
            style={{ color: 'var(--text-muted)' }}>⊗</button>
        </div>
      </div>
      <div className="habit-card-name">{habit.name}</div>
      <div className="habit-card-meta">
        <span className="badge badge-gray">{habit.category}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{habit.frequency.type}</span>
      </div>

      <div className="habit-card-stats">
        <div className="habit-stat">
          <span className="habit-stat-val" style={{ color: '#f97316' }}>🔥 {habit.streak?.current || 0}</span>
          <span className="habit-stat-lbl">streak</span>
        </div>
        <div className="habit-stat">
          <span className="habit-stat-val">{habit.streak?.longest || 0}</span>
          <span className="habit-stat-lbl">best</span>
        </div>
        <div className="habit-stat">
          <span className="habit-stat-val">{completionRate}%</span>
          <span className="habit-stat-lbl">30d rate</span>
        </div>
      </div>

      <button className={`habit-check-btn ${isDoneToday ? 'done' : ''}`}
        onClick={handleToggle} disabled={toggling}>
        {isDoneToday ? '✓ Done Today' : toggling ? '...' : '+ Mark Done'}
      </button>
    </div>
  );
}

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editHabit, setEditHabit] = useState(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await habitsAPI.getAll();
      setHabits(res.habits || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const filtered = filter === 'all' ? habits : habits.filter(h => h.category === filter);

  const handleToggle = async (id) => {
    const today = new Date().toISOString().split('T')[0];
    // Optimistic update — flip completion instantly, no spinner
    setHabits(prev => prev.map(h => {
      if (h._id !== id) return h;
      const alreadyDone = (h.completions || []).some(c => c.date === today);
      const completions = alreadyDone
        ? h.completions.filter(c => c.date !== today)
        : [...(h.completions || []), { date: today }];
      return { ...h, completions };
    }));
    try {
      await habitsAPI.complete(id, {});
      load(false); // silent background sync to get updated streaks from server
    } catch (err) {
      console.error('Toggle error:', err);
      load(false); // revert by re-fetching on failure
    }
  };

  const handleEdit = (h) => { setEditHabit(h); setShowModal(true); };
  const handleNew = () => { setEditHabit(null); setShowModal(true); };

  const handleSave = (saved) => {
    setHabits(prev => {
      const idx = prev.findIndex(h => h._id === saved._id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this habit?')) return;
    await habitsAPI.delete(id);
    setHabits(prev => prev.filter(h => h._id !== id));
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Habits</h1>
          <p className="page-subtitle">{habits.length} habits · {habits.filter(h => h.streak?.current > 0).length} active streaks</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>+ New Habit</button>
      </div>

      <div className="category-tabs">
        {CATEGORIES.map(c => (
          <button key={c} className={`cat-tab ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="loading-spinner" style={{ margin: 'auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <h3>{filter === 'all' ? 'No habits yet' : `No ${filter} habits`}</h3>
          <p>Create your first habit to start building streaks</p>
        </div>
      ) : (
        <div className="habits-grid">
          {filtered.map(h => (
            <HabitCard key={h._id} habit={h} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <HabitModal habit={editHabit} onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
    </div>
  );
}
