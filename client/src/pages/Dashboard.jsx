

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { habitsAPI, goalsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="stat-card" style={{ '--accent': color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

const HabitTodayItem = ({ habit, onToggle }) => {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await onToggle(habit._id);
    setLoading(false);
  };
  return (
    <div className={`habit-today-item ${habit.isCompletedToday ? 'completed' : ''}`}>
      <button className={`checkbox ${habit.isCompletedToday ? 'checked' : ''}`}
        onClick={handle} disabled={loading} />
      <span className="habit-today-icon" style={{ background: habit.color + '20' }}>{habit.icon}</span>
      <div className="habit-today-info">
        <span className="habit-today-name">{habit.name}</span>
        <span className="habit-today-category">{habit.category}</span>
      </div>
      {habit.streak?.current > 0 && (
        <div className="habit-streak-badge">
          <span className="streak-fire">🔥</span> {habit.streak.current}
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [todayHabits, setTodayHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);   // true only on first mount
  const [errors, setErrors] = useState({});

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    const errs = {};

    // Load each independently so one failure doesn't block others
    const [habitsResult, goalsResult, statsResult] = await Promise.allSettled([
      habitsAPI.getToday(),
      goalsAPI.getAll({ status: 'in_progress' }),
      habitsAPI.getStats(),
    ]);

    if (habitsResult.status === 'fulfilled') {
      setTodayHabits(habitsResult.value.habits || []);
    } else {
      console.error('Today habits error:', habitsResult.reason);
      errs.habits = habitsResult.reason?.message;
    }

    if (goalsResult.status === 'fulfilled') {
      setGoals((goalsResult.value.goals || []).slice(0, 4));
    } else {
      console.error('Goals error:', goalsResult.reason);
      errs.goals = goalsResult.reason?.message;
    }

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value.stats);
    } else {
      console.error('Stats error:', statsResult.reason);
      errs.stats = statsResult.reason?.message;
    }

    setErrors(errs);
    setLoading(false);
  }, []);

  // Initial load only — subsequent refreshes are silent
  useEffect(() => { load(true); }, [load]);

  const toggleHabit = async (id) => {
    // Optimistic update — flip state immediately, no spinner
    setTodayHabits(prev =>
      prev.map(h => h._id === id ? { ...h, isCompletedToday: !h.isCompletedToday } : h)
    );
    try {
      await habitsAPI.complete(id, {});
      // Silent background refresh to get accurate streak/stats from server
      load(false);
    } catch (err) {
      // Revert optimistic update on failure
      setTodayHabits(prev =>
        prev.map(h => h._id === id ? { ...h, isCompletedToday: !h.isCompletedToday } : h)
      );
      console.error('Toggle habit error:', err);
    }
  };

  const completedCount = todayHabits.filter(h => h.isCompletedToday).length;
  const completionPct = todayHabits.length ? Math.round((completedCount / todayHabits.length) * 100) : 0;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-greeting">{getGreeting()}, {user?.name?.split(' ')[0]} 👋</div>
          <div className="dashboard-date">{today}</div>
        </div>
        <div className="dashboard-daily-ring">
          <svg viewBox="0 0 48 48" className="ring-svg">
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--amber)" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionPct / 100)}`}
              strokeLinecap="round" transform="rotate(-90 24 24)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          </svg>
          <div className="ring-text">
            <span className="ring-pct">{completionPct}%</span>
          </div>
        </div>
      </div>

      {/* Show API errors as a subtle debug banner */}
      {Object.keys(errors).length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
          ⚠ Some data failed to load: {Object.values(errors).join(' · ')}
          &nbsp;<button onClick={load} style={{ background: 'none', border: 'none', color: 'var(--amber)', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      <div className="stats-row">
        <StatCard icon="◎" label="Today's Habits" value={`${completedCount}/${todayHabits.length}`} color="var(--amber)" />
        <StatCard icon="🔥" label="Best Streak" value={stats?.longestStreak ?? 0} sub="days" color="#f97316" />
        <StatCard icon="🎯" label="Active Goals" value={goals.length} color="var(--green)" />
        <StatCard icon="⚡" label="Total Completions" value={user?.stats?.totalHabitsCompleted ?? 0} color="var(--blue)" />
      </div>

      <div className="dashboard-body">
        <div className="dashboard-col">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Today's Habits</h3>
              <Link to="/habits" className="card-link">Manage →</Link>
            </div>
            {todayHabits.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">◎</div>
                <h3>No habits scheduled</h3>
                <p>Add your first habit to get started</p>
              </div>
            ) : (
              <div className="habit-list">
                {todayHabits.map(h => (
                  <HabitTodayItem key={h._id} habit={h} onToggle={toggleHabit} />
                ))}
              </div>
            )}
            {todayHabits.length > 0 && (
              <div className="today-progress">
                <div className="today-progress-bar">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${completionPct}%` }} />
                  </div>
                </div>
                <span className="today-progress-label">{completedCount} of {todayHabits.length} done</span>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-col">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Active Goals</h3>
              <Link to="/goals" className="card-link">View all →</Link>
            </div>
            {goals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">◈</div>
                <h3>No active goals</h3>
                <p>Set a goal to start tracking progress</p>
              </div>
            ) : (
              <div className="goal-list">
                {goals.map(g => (
                  <div key={g._id} className="goal-item-dash">
                    <div className="goal-item-top">
                      <span className="goal-icon">{g.icon}</span>
                      <div className="goal-item-info">
                        <span className="goal-item-title">{g.title}</span>
                        <span className="goal-item-due">Due {new Date(g.targetDate).toLocaleDateString()}</span>
                      </div>
                      <span className="goal-item-pct">{g.progress}%</span>
                    </div>
                    <div className="progress-bar" style={{ marginTop: 8 }}>
                      <div className={`progress-fill ${g.progress >= 80 ? '' : g.progress >= 40 ? 'progress-fill-blue' : 'progress-fill-green'}`}
                        style={{ width: `${g.progress}%` }} />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      {g.subTasks?.filter(t => t.isCompleted).length || 0}/{g.subTasks?.length || 0} tasks complete
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stats?.last30Days && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <h3 className="card-title">30-Day Activity</h3>
              </div>
              <div className="activity-dots">
                {stats.last30Days.slice(-21).map((d, i) => {
                  const pct = d.total > 0 ? d.completed / d.total : 0;
                  return (
                    <div key={i} className="activity-dot"
                      style={{ background: pct === 0 ? 'var(--border)' : pct < 0.5 ? 'var(--amber-dim)' : pct < 1 ? 'rgba(245,158,11,0.5)' : 'var(--amber)' }}
                      title={`${d.date}: ${d.completed}/${d.total}`} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
