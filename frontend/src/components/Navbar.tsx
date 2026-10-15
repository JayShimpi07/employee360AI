import React from 'react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  activeTab: 'dashboard' | 'studio' | 'interview' | 'evidence';
  setActiveTab: (tab: 'dashboard' | 'studio' | 'interview' | 'evidence') => void;
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
      padding: '12px 32px',
      borderBottom: '1px solid var(--border-subtle)',
      background: '#ffffff',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          background: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.15rem',
          color: '#ffffff',
          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
        }}>
          360
        </div>
        <div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Employee<span style={{ color: 'var(--accent-primary)' }}>360 AI</span>
          </span>
          <span style={{
            display: 'block',
            fontSize: '0.68rem',
            color: 'var(--text-dim)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            Autonomous HR Framework &bull; Zensar
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div style={{
        display: 'flex',
        gap: '4px',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            background: activeTab === 'dashboard' ? '#ffffff' : 'transparent',
            color: activeTab === 'dashboard' ? 'var(--accent-primary)' : 'var(--text-muted)',
            border: activeTab === 'dashboard' ? '1px solid #e2e8f0' : '1px solid transparent',
            borderRadius: '6px',
            padding: '7px 16px',
            fontWeight: activeTab === 'dashboard' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'dashboard' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          HR Command Center
        </button>
        <button
          onClick={() => setActiveTab('studio')}
          style={{
            background: activeTab === 'studio' ? '#ffffff' : 'transparent',
            color: activeTab === 'studio' ? 'var(--accent-primary)' : 'var(--text-muted)',
            border: activeTab === 'studio' ? '1px solid #e2e8f0' : '1px solid transparent',
            borderRadius: '6px',
            padding: '7px 16px',
            fontWeight: activeTab === 'studio' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'studio' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Agent Studio
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          style={{
            background: activeTab === 'evidence' ? '#ffffff' : 'transparent',
            color: activeTab === 'evidence' ? 'var(--accent-primary)' : 'var(--text-muted)',
            border: activeTab === 'evidence' ? '1px solid #e2e8f0' : '1px solid transparent',
            borderRadius: '6px',
            padding: '7px 16px',
            fontWeight: activeTab === 'evidence' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'evidence' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Evidence & Decision Center ⚖️
        </button>
        <button
          onClick={() => setActiveTab('interview')}
          style={{
            background: activeTab === 'interview' ? '#ffffff' : 'transparent',
            color: activeTab === 'interview' ? 'var(--accent-primary)' : 'var(--text-muted)',
            border: activeTab === 'interview' ? '1px solid #e2e8f0' : '1px solid transparent',
            borderRadius: '6px',
            padding: '7px 16px',
            fontWeight: activeTab === 'interview' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'interview' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Candidate Portal 🎙️
        </button>
      </div>

      {/* User / Auth Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{currentUser.full_name}</div>
              <span className={`badge ${currentUser.role === 'HR_ADMIN' ? 'badge-indigo' : 'badge-emerald'}`}>
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
            <button className="btn-secondary" onClick={onLogout} style={{ padding: '6px 12px', fontSize: '0.80rem' }}>
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
