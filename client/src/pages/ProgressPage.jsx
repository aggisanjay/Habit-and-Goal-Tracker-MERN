

import React, { useState, useEffect, useCallback } from 'react';
import { habitsAPI } from '../utils/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import './ProgressPage.css';

const CHART_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="ct-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="ct-value" style={{ color: p.color }}>
          {p.name}: {p.value}{p.name === 'Rate' ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

export default function ProgressPage() {
  const [stats, setStats] = useState(null);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, habitsRes] = await Promise.all([
        habitsAPI.getStats(),
        habitsAPI.getAll(),
      ]);
      setStats(statsRes.stats);
      setHabits(habitsRes.habits || []);
    } catch (err) {
      console.error('Progress load error:', err);
      setError(err.message || 'Failed to load progress data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="loading-spinner" />
    </div>
  );

  if (error) return (
    <div>
      <div className="page-header"><h1 className="page-title">Progress</h1></div>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '16px', color: '#ef4444' }}>
        ⚠ {error} <button onClick={load} style={{ background: 'none', border: 'none', color: 'var(--amber)', cursor: 'pointer', fontWeight: 600, marginLeft: 8 }}>Retry</button>
      </div>
    </div>
  );

  const chartData = (stats?.last30Days || []).slice(-period).map(d => ({
    date: d.date.slice(5),
    Completed: d.completed,
    Total: d.total,
    Rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
  }));

  const categoryData = Object.entries(stats?.byCategory || {}).map(([cat, data]) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: data.count,
    completions: data.completions,
  }));

  const streakData = habits
    .filter(h => h.streak?.current > 0 || h.streak?.longest > 0)
    .sort((a, b) => (b.streak?.current || 0) - (a.streak?.current || 0))
    .slice(0, 8)
    .map(h => ({
      name: h.name.length > 14 ? h.name.slice(0, 14) + '…' : h.name,
      Current: h.streak?.current || 0,
      Best: h.streak?.longest || 0,
    }));

  const completionRateAvg = chartData.length
    ? Math.round(chartData.reduce((s, d) => s + d.Rate, 0) / chartData.length)
    : 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Progress</h1>
          <p className="page-subtitle">Visualize your habit performance over time</p>
        </div>
        <div className="period-selector">
          {[7, 14, 30].map(p => (
            <button key={p} className={`period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
              {p}d
            </button>
          ))}
        </div>
      </div>

      <div className="progress-summary">
        <div className="ps-card">
          <span className="ps-icon">📊</span>
          <div><div className="ps-val">{completionRateAvg}%</div><div className="ps-lbl">Avg Completion</div></div>
        </div>
        <div className="ps-card">
          <span className="ps-icon">🔥</span>
          <div><div className="ps-val">{stats?.longestStreak || 0}</div><div className="ps-lbl">Best Streak</div></div>
        </div>
        <div className="ps-card">
          <span className="ps-icon">⚡</span>
          <div><div className="ps-val">{stats?.totalStreaks || 0}</div><div className="ps-lbl">Active Streaks</div></div>
        </div>
        <div className="ps-card">
          <span className="ps-icon">◎</span>
          <div><div className="ps-val">{stats?.totalHabits || 0}</div><div className="ps-lbl">Total Habits</div></div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="card-title" style={{ marginBottom: 20 }}>Daily Completion Rate ({period} Days)</h3>
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No data yet — complete some habits to see your chart</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Rate" name="Rate" stroke="#f59e0b"
                  fill="url(#amber)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {streakData.length > 0 && (
          <div className="card chart-card">
            <h3 className="card-title" style={{ marginBottom: 20 }}>Top Streaks</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={streakData} margin={{ top: 5, right: 10, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Current" name="Current" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Best" name="Best" fill="rgba(245,158,11,0.3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {categoryData.length > 0 && (
          <div className="card chart-card">
            <h3 className="card-title" style={{ marginBottom: 20 }}>By Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, name]} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="card chart-card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="card-title" style={{ marginBottom: 20 }}>Completed vs Total Habits Per Day</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData.slice(-14)} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Total" name="Total" fill="rgba(255,255,255,0.06)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {habits.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 className="card-title" style={{ marginBottom: 16 }}>Habit Breakdown</h3>
          <div className="habit-breakdown">
            {habits.map(h => {
              const recent30 = (h.completions || []).filter(c => {
                const d = new Date(c.date);
                return d >= new Date(Date.now() - 30 * 86400000);
              }).length;
              const rate = Math.round((recent30 / 30) * 100);
              return (
                <div key={h._id} className="hb-row">
                  <span className="hb-icon" style={{ background: h.color + '20' }}>{h.icon}</span>
                  <div className="hb-info">
                    <div className="hb-name">{h.name}</div>
                    <div className="progress-bar" style={{ marginTop: 4 }}>
                      <div className="progress-fill" style={{ width: `${rate}%`, background: h.color }} />
                    </div>
                  </div>
                  <div className="hb-stats">
                    <div style={{ fontSize: 14, fontWeight: 700, color: h.color }}>{rate}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔥 {h.streak?.current || 0}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}