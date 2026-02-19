import React, { useState, useEffect, useCallback } from 'react';
import { habitsAPI } from '../utils/api';
import './CalendarPage.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calData, setCalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await habitsAPI.getCalendar(year, month);
      setCalData(res.data || {});
    } finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  // Adjust to Monday-first
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = now.toISOString().split('T')[0];

  const getDateStr = (d) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getIntensity = (d) => {
    if (!d) return 0;
    const key = getDateStr(d);
    const info = calData[key];
    if (!info || info.total === 0) return 0;
    const pct = info.completed / info.total;
    if (pct === 0) return 0;
    if (pct < 0.33) return 1;
    if (pct < 0.66) return 2;
    if (pct < 1) return 3;
    return 4;
  };

  const selectedKey = selected ? getDateStr(selected) : null;
  const selectedInfo = selectedKey ? calData[selectedKey] : null;

  // Stats for month
  const monthDays = Object.values(calData);
  const totalCompleted = monthDays.reduce((s, d) => s + d.completed, 0);
  const perfectDays = monthDays.filter(d => d.total > 0 && d.completed >= d.total).length;
  const activeDays = monthDays.filter(d => d.completed > 0).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <p className="page-subtitle">Monthly habit completion heat map</p>
      </div>

      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="cal-nav">
            <button className="btn btn-secondary btn-sm" onClick={prevMonth}>←</button>
            <h2 className="cal-month-title">{MONTHS[month - 1]} {year}</h2>
            <button className="btn btn-secondary btn-sm" onClick={nextMonth}>→</button>
          </div>

          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-day-header">{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} className="cal-cell empty" />;
              const dateStr = getDateStr(d);
              const isToday = dateStr === today;
              const intensity = getIntensity(d);
              const info = calData[dateStr];
              return (
                <div key={dateStr}
                  className={`cal-cell ${isToday ? 'today' : ''} ${selected === d ? 'selected' : ''} intensity-${intensity}`}
                  onClick={() => setSelected(selected === d ? null : d)}>
                  <span className="cal-day-num">{d}</span>
                  {info && info.completed > 0 && (
                    <span className="cal-completion">{info.completed}/{info.total}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="cal-legend">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completion:</span>
            {[0, 1, 2, 3, 4].map(n => (
              <div key={n} className={`legend-dot intensity-${n}`} />
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>100%</span>
          </div>
        </div>

        <div className="calendar-side">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Month Stats</h3>
            <div className="month-stats">
              <div className="month-stat">
                <span className="month-stat-val" style={{ color: 'var(--amber)' }}>{totalCompleted}</span>
                <span className="month-stat-lbl">Total Completions</span>
              </div>
              <div className="month-stat">
                <span className="month-stat-val" style={{ color: 'var(--green)' }}>{perfectDays}</span>
                <span className="month-stat-lbl">Perfect Days</span>
              </div>
              <div className="month-stat">
                <span className="month-stat-val">{activeDays}</span>
                <span className="month-stat-lbl">Active Days</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}><div className="loading-spinner" style={{ margin: 'auto' }} /></div>
          ) : selected && selectedInfo ? (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 12 }}>
                {MONTHS[month - 1]} {selected}
              </h3>
              <div style={{ marginBottom: 14 }}>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill progress-fill-green"
                    style={{ width: `${selectedInfo.total > 0 ? (selectedInfo.completed / selectedInfo.total) * 100 : 0}%` }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {selectedInfo.completed} of {selectedInfo.total} habits completed
                </div>
              </div>
              {selectedInfo.habits?.length > 0 && (
                <div>
                  <div className="section-title">Completed Habits</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedInfo.habits.map((h, i) => (
                      <div key={i} className="cal-habit-item">
                        <span>{h.icon}</span>
                        <span style={{ fontSize: 14 }}>{h.name}</span>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: h.color, marginLeft: 'auto' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Click a day to see completed habits</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}