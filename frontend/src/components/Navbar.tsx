import React from 'react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  activeTab: 'dashboard' | 'studio';
  setActiveTab: (tab: 'dashboard' | 'studio') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  activeTab,
  setActiveTab,
}) => {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 36px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'var(--gradient-brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.25rem',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
        }}>
          360
        </div>
        <div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800 }} className="brand-font">
            Employee<span className="gradient-text">360 AI</span>
          </span>
          <span style={{
            display: 'block',
            fontSize: '0.70rem',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            Autonomous HR Framework
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '12px' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            background: activeTab === 'dashboard' ? 'var(--gradient-brand)' : 'transparent',
            color: activeTab === 'dashboard' ? '#ffffff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          HR Command Center
        </button>
        <button
          onClick={() => setActiveTab('studio')}
          style={{
            background: activeTab === 'studio' ? 'var(--gradient-brand)' : 'transparent',
            color: activeTab === 'studio' ? '#ffffff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Agent Configuration Studio
        </button>
      </div>

      {/* User / Auth Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{currentUser.full_name}</div>
              <span className={`badge ${currentUser.role === 'HR_ADMIN' ? 'badge-indigo' : 'badge-emerald'}`}>
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
            <button className="btn-secondary" onClick={onLogout} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              Sign Out
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={onOpenLogin}>
            Sign In / Switch Role
          </button>
        )}
      </div>
    </nav>
  );
};
