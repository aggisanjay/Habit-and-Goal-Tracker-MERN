import React, { useState } from 'react';
import { emailAPI, habitsAPI, goalsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './EmailPage.css';

export default function EmailPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    recipientEmail: '',
    recipientName: '',
    clientName: '',
    message: '',
  });
  const [status, setStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [errMsg, setErrMsg] = useState('');
  const [preview, setPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const [habitsRes, goalsRes, statsRes] = await Promise.all([
        habitsAPI.getToday(),
        goalsAPI.getAll({ status: 'in_progress' }),
        habitsAPI.getStats(),
      ]);
      setPreviewData({
        habits: habitsRes.habits || [],
        goals: goalsRes.goals || [],
        stats: statsRes.stats,
      });
      setPreview(true);
    } finally { setPreviewLoading(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.recipientEmail) return;
    setStatus('loading');
    try {
      await emailAPI.sendProgressReport(form);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrMsg(err.message || 'Failed to send');
    }
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Progress Reports</h1>
        <p className="page-subtitle">Send beautiful HTML progress reports to clients or stakeholders</p>
      </div>

      <div className="email-layout">
        <div className="email-form-col">
          <div className="card">
            <h3 className="email-section-title">📧 Send Report</h3>
            {status === 'success' ? (
              <div className="email-success">
                <div className="email-success-icon">✓</div>
                <h3>Report Sent!</h3>
                <p>Your progress report has been delivered to {form.recipientEmail}</p>
                <button className="btn btn-secondary" style={{ marginTop: 16 }}
                  onClick={() => { setStatus(null); setForm({ recipientEmail: '', recipientName: '', clientName: '', message: '' }); }}>
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Recipient Email *</label>
                  <input className="form-input" type="email" placeholder="client@company.com"
                    value={form.recipientEmail} onChange={e => update('recipientEmail', e.target.value)} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Recipient Name</label>
                    <input className="form-input" placeholder="John Smith"
                      value={form.recipientName} onChange={e => update('recipientName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client / Company</label>
                    <input className="form-input" placeholder="Acme Corp"
                      value={form.clientName} onChange={e => update('clientName', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Personal Message (optional)</label>
                  <textarea className="form-textarea" rows={4}
                    placeholder="Add a custom message that will appear in the report..."
                    value={form.message} onChange={e => update('message', e.target.value)} />
                </div>

                {status === 'error' && (
                  <div className="auth-error">⚠ {errMsg}</div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={loadPreview} disabled={previewLoading}>
                    {previewLoading ? '...' : '👁 Preview'}
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={status === 'loading'}>
                    {status === 'loading' ? '⏳ Sending...' : '📨 Send Report'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="card">
            <h3 className="email-section-title">ℹ About Reports</h3>
            <ul className="email-info-list">
              <li>✦ Reports include your top streaks, active goals with progress</li>
              <li>✦ Beautifully designed dark HTML email template</li>
              <li>✦ Shows completion stats for today and monthly average</li>
              <li>✦ Custom message is included if provided</li>
              <li>✦ Configure SMTP settings in your .env file to enable sending</li>
            </ul>
          </div>
        </div>

        <div className="email-preview-col">
          {preview && previewData ? (
            <div className="card email-preview-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 className="email-section-title" style={{ margin: 0 }}>Email Preview</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setPreview(false)}>Close</button>
              </div>
              <div className="email-preview">
                <div className="ep-header">
                  <div className="ep-logo">⚡ HabitFlow</div>
                  <div className="ep-date">Progress Report — {today}</div>
                </div>
                <div className="ep-body">
                  <p className="ep-greeting">Hello {form.recipientName || form.clientName || 'there'},</p>
                  <p className="ep-sub">Here's the latest progress update from <strong>{user?.name}</strong>.</p>

                  <div className="ep-stats">
                    <div className="ep-stat">
                      <div className="ep-stat-val">
                        {previewData.habits.filter(h => h.isCompletedToday).length}/{previewData.habits.length}
                      </div>
                      <div className="ep-stat-lbl">Today</div>
                    </div>
                    <div className="ep-stat">
                      <div className="ep-stat-val">
                        {previewData.goals.length > 0
                          ? Math.round(previewData.goals.reduce((s, g) => s + g.progress, 0) / previewData.goals.length)
                          : 0}%
                      </div>
                      <div className="ep-stat-lbl">Goals Avg</div>
                    </div>
                    <div className="ep-stat">
                      <div className="ep-stat-val">{previewData.stats?.longestStreak || 0}</div>
                      <div className="ep-stat-lbl">Best Streak</div>
                    </div>
                  </div>

                  {form.message && (
                    <div className="ep-message">"{form.message}"</div>
                  )}

                  {previewData.goals.slice(0, 3).map(g => (
                    <div key={g._id} className="ep-goal">
                      <div className="ep-goal-name">{g.icon} {g.title}</div>
                      <div style={{ height: 4, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${g.progress}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#666', textAlign: 'right', marginTop: 2 }}>{g.progress}%</div>
                    </div>
                  ))}
                </div>
                <div className="ep-footer">Sent via HabitFlow · Track. Streak. Achieve.</div>
              </div>
            </div>
          ) : (
            <div className="card email-preview-placeholder">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: 8 }}>Email Preview</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  Click "Preview" to see how your report will look
                </p>
              </div>
              <div className="email-template-info">
                <div className="eti-row">
                  <span>📈</span>
                  <span>Completion stats & streaks</span>
                </div>
                <div className="eti-row">
                  <span>🎯</span>
                  <span>Active goals with progress bars</span>
                </div>
                <div className="eti-row">
                  <span>🔥</span>
                  <span>Top streaks leaderboard</span>
                </div>
                <div className="eti-row">
                  <span>✉️</span>
                  <span>Custom message from you</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}