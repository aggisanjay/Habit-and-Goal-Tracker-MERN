import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        await register(form.name, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">⚡</div>
          <h1>HabitFlow</h1>
        </div>
        <div className="auth-hero">
          <h2>Build habits that<br /><span className="text-amber">actually stick.</span></h2>
          <p>Track streaks, visualize progress, and achieve your goals with a system designed for results.</p>
        </div>
        <div className="auth-features">
          {['🔥 Streak tracking & analysis', '📊 Interactive progress charts', '📅 Calendar heat map view', '🎯 Goals with sub-tasks', '📧 Email progress reports'].map(f => (
            <div key={f} className="auth-feature">{f}</div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
            <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Create Account</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="Alex Johnson" value={form.name}
                  onChange={e => update('name', e.target.value)} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => update('email', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                value={form.password} onChange={e => update('password', e.target.value)} required />
            </div>

            {error && <div className="auth-error">⚠ {error}</div>}

            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? '...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <p className="auth-hint">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button className="auth-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}