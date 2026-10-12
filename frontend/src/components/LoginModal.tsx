import React, { useState } from 'react';
import { api, setStoredToken } from '../api';
import { User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const e = loginEmail || email;
    const p = loginPassword || password;
    if (!e || !p) {
      setError('Please provide email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.login(e, p);
      setStoredToken(res.access_token);
      const me = await api.getMe();
      onLoginSuccess(me);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '32px',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Employee360 Authentication</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Role-Based Access Control System</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            color: '#fda4af',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {/* Quick Demo Logins */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px' }}>
            Instant Role Switch (Seed Accounts)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn-secondary"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => handleLogin('admin@zensar.com', 'admin123')}
              disabled={loading}
            >
              <span><strong>HR Administrator</strong> (admin@zensar.com)</span>
              <span className="badge badge-indigo">Admin</span>
            </button>
            <button
              className="btn-secondary"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => handleLogin('reviewer@zensar.com', 'reviewer123')}
              disabled={loading}
            >
              <span><strong>Technical Reviewer</strong> (reviewer@zensar.com)</span>
              <span className="badge badge-cyan">Reviewer</span>
            </button>
            <button
              className="btn-secondary"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => handleLogin('alex.smith@zensar.com', 'employee123')}
              disabled={loading}
            >
              <span><strong>Synthetic Employee</strong> (alex.smith@zensar.com)</span>
              <span className="badge badge-emerald">Employee</span>
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '14px 0', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          — OR ENTER CREDENTIALS —
        </div>

        {/* Form Inputs */}
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@zensar.com"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
