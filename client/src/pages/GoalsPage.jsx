
import React, { useState, useEffect, useCallback } from 'react';
import { goalsAPI } from '../utils/api';
import './GoalsPage.css';

const STATUSES = ['all', 'not_started', 'in_progress', 'on_hold', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const CATEGORIES = ['personal', 'career', 'health', 'finance', 'education', 'relationship', 'other'];
const STATUS_COLORS = { not_started: 'gray', in_progress: 'blue', on_hold: 'amber', completed: 'green', cancelled: 'red' };

const defaultGoal = {
  title: '', description: '', icon: '🎯', color: '#10b981',
  category: 'personal', priority: 'medium', status: 'not_started',
  startDate: new Date().toISOString().split('T')[0],
  targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
};

function GoalModal({ goal, onClose, onSave }) {
  const [form, setForm] = useState(goal || defaultGoal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (goal?._id) { const r = await goalsAPI.update(goal._id, form); onSave(r.goal); }
      else { const r = await goalsAPI.create(form); onSave(r.goal); }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save goal');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{goal?._id ? 'Edit Goal' : 'New Goal'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Goal Title</label>
              <input className="form-input" placeholder="e.g. Run a 5K race"
                value={form.title} onChange={e => update('title', e.target.value)} required />
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => update('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => update('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Icon</label>
                <input className="form-input" style={{ fontSize: 20, textAlign: 'center' }}
                  value={form.icon} onChange={e => update('icon', e.target.value)} maxLength={2} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Target Date</label>
                <input className="form-input" type="date" value={form.targetDate} onChange={e => update('targetDate', e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} placeholder="Describe your goal and why it matters..."
                value={form.description} onChange={e => update('description', e.target.value)} />
            </div>
            {error && <div className="auth-error">⚠ {error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : goal?._id ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoalDetail({ goal, onClose, onUpdate }) {
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);
  const [g, setG] = useState(goal);

  // Keep local state in sync if parent updates the goal
  useEffect(() => { setG(goal); }, [goal]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setAdding(true);
    try {
      const r = await goalsAPI.addSubTask(g._id, { title: newTask.trim() });
      setG(r.goal); onUpdate(r.goal); setNewTask('');
    } catch (err) {
      console.error('Add task error:', err);
    } finally { setAdding(false); }
  };

  const toggleTask = async (taskId, isCompleted) => {
    try {
      const r = await goalsAPI.updateSubTask(g._id, taskId, { isCompleted });
      setG(r.goal); onUpdate(r.goal);
    } catch (err) { console.error('Toggle task error:', err); }
  };

  const deleteTask = async (taskId) => {
    try {
      const r = await goalsAPI.deleteSubTask(g._id, taskId);
      setG(r.goal); onUpdate(r.goal);
    } catch (err) { console.error('Delete task error:', err); }
  };

  const updateStatus = async (status) => {
    try {
      const r = await goalsAPI.update(g._id, { ...g, status });
      setG(r.goal); onUpdate(r.goal);
    } catch (err) { console.error('Update status error:', err); }
  };

  const daysLeft = Math.ceil((new Date(g.targetDate) - new Date()) / 86400000);
  const completed = g.subTasks?.filter(t => t.isCompleted).length || 0;
  const total = g.subTasks?.length || 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{g.icon}</span>
            <div>
              <h2 className="modal-title">{g.title}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span className={`badge badge-${STATUS_COLORS[g.status] || 'gray'}`}>{g.status.replace('_', ' ')}</span>
                <span className={`badge badge-${g.priority === 'critical' ? 'red' : g.priority === 'high' ? 'amber' : 'gray'}`}>{g.priority}</span>
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {g.description && <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{g.description}</p>}

          <div className="goal-detail-stats">
            <div className="gd-stat">
              <span className="gd-stat-val" style={{ color: daysLeft < 0 ? 'var(--red)' : daysLeft < 7 ? 'var(--amber)' : 'var(--green)' }}>
                {daysLeft < 0 ? 'Overdue' : `${daysLeft}d`}
              </span>
              <span className="gd-stat-lbl">remaining</span>
            </div>
            <div className="gd-stat">
              <span className="gd-stat-val">{g.progress}%</span>
              <span className="gd-stat-lbl">complete</span>
            </div>
            <div className="gd-stat">
              <span className="gd-stat-val">{completed}/{total}</span>
              <span className="gd-stat-lbl">tasks done</span>
            </div>
          </div>

          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill progress-fill-green" style={{ width: `${g.progress}%` }} />
          </div>

          <div>
            <div className="section-title">Sub-tasks</div>
            <div className="subtasks-list">
              {g.subTasks?.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tasks yet. Add your first task below.</p>
              )}
              {g.subTasks?.map(task => (
                <div key={task._id} className={`subtask-item ${task.isCompleted ? 'done' : ''}`}>
                  <button className={`checkbox ${task.isCompleted ? 'checked' : ''}`}
                    onClick={() => toggleTask(task._id, !task.isCompleted)} />
                  <span className="subtask-title">{task.title}</span>
                  <button className="btn btn-ghost btn-icon" style={{ fontSize: 12, color: 'var(--text-muted)' }}
                    onClick={() => deleteTask(task._id)}>⊗</button>
                </div>
              ))}
            </div>
            <form className="add-task-form" onSubmit={addTask}>
              <input className="form-input" placeholder="Add a task..." value={newTask}
                onChange={e => setNewTask(e.target.value)} />
              <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                {adding ? '...' : '+ Add'}
              </button>
            </form>
          </div>

          <div>
            <div className="section-title">Update Status</div>
            <div className="status-buttons">
              {STATUSES.filter(s => s !== 'all').map(s => (
                <button key={s} onClick={() => updateStatus(s)}
                  className={`status-btn ${g.status === s ? 'active' : ''}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal, onClick, onDelete }) {
  const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / 86400000);
  const completed = goal.subTasks?.filter(t => t.isCompleted).length || 0;

  return (
    <div className="goal-card" style={{ '--gc': goal.color }} onClick={onClick}>
      <div className="goal-card-top">
        <span className="goal-card-icon">{goal.icon}</span>
        <div>
          <span className={`badge badge-${STATUS_COLORS[goal.status] || 'gray'}`}>{goal.status.replace('_', ' ')}</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={e => { e.stopPropagation(); onDelete(goal._id); }}
          style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>⊗</button>
      </div>
      <div className="goal-card-title">{goal.title}</div>
      <div className="goal-card-meta">
        <span className={`badge badge-${goal.priority === 'critical' ? 'red' : goal.priority === 'high' ? 'amber' : 'gray'}`}>
          {goal.priority}
        </span>
        <span style={{ fontSize: 12, color: daysLeft < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
          {daysLeft < 0 ? 'Overdue' : `${daysLeft} days left`}
        </span>
      </div>
      <div className="goal-card-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${goal.progress}%`, background: goal.color }} />
        </div>
        <div className="goal-progress-info">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{completed}/{goal.subTasks?.length || 0} tasks</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: goal.color }}>{goal.progress}%</span>
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [detailGoal, setDetailGoal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await goalsAPI.getAll();
      setGoals(res.goals || []);
    } catch (err) {
      console.error('Goals load error:', err);
      setError(err.message || 'Failed to load goals');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? goals : goals.filter(g => g.status === filter);

  const handleSave = (saved) => {
    setGoals(prev => {
      const idx = prev.findIndex(g => g._id === saved._id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await goalsAPI.delete(id);
      setGoals(prev => prev.filter(g => g._id !== id));
      if (detailGoal?._id === id) setDetailGoal(null);
    } catch (err) { console.error('Delete goal error:', err); }
  };

  const handleUpdate = (updated) => {
    setGoals(prev => prev.map(g => g._id === updated._id ? updated : g));
    setDetailGoal(updated);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="page-subtitle">{goals.length} goals · {goals.filter(g => g.status === 'completed').length} completed</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditGoal(null); setShowModal(true); }}>+ New Goal</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
          ⚠ {error} <button onClick={load} style={{ background: 'none', border: 'none', color: 'var(--amber)', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      <div className="category-tabs">
        {STATUSES.map(s => (
          <button key={s} className={`cat-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            {s !== 'all' && <span style={{ marginLeft: 6, opacity: 0.7 }}>({goals.filter(g => g.status === s).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="loading-spinner" style={{ margin: 'auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <h3>No goals {filter !== 'all' ? `with status "${filter.replace('_', ' ')}"` : 'yet'}</h3>
          <p>Set your first goal and break it into actionable tasks</p>
        </div>
      ) : (
        <div className="goals-grid">
          {filtered.map(g => (
            <GoalCard key={g._id} goal={g}
              onClick={() => setDetailGoal(g)}
              onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && <GoalModal goal={editGoal} onClose={() => setShowModal(false)} onSave={handleSave} />}
      {detailGoal && <GoalDetail goal={detailGoal} onClose={() => setDetailGoal(null)} onUpdate={handleUpdate} />}
    </div>
  );
}