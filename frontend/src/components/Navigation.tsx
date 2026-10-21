import React from 'react';
import { User, UserRole } from '../types';

export type NavDestination =
  | 'overview'
  | 'workflows'
  | 'people'
  | 'agent'
  | 'evidence'
  | 'testing'
  | 'admin'
  | 'employee';

interface NavigationProps {
  currentUser: User | null;
  activeDestination: NavDestination;
  onNavigate: (dest: NavDestination) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenHelp: () => void;
}

interface NavItem {
  id: NavDestination;
  label: string;
  allowedRoles: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', allowedRoles: ['HR_ADMIN', 'HR_REVIEWER'] },
  { id: 'workflows', label: 'Workflows', allowedRoles: ['HR_ADMIN'] },
  { id: 'people', label: 'People', allowedRoles: ['HR_ADMIN', 'HR_REVIEWER'] },
  { id: 'agent', label: 'AI Agent', allowedRoles: ['HR_ADMIN'] },
  { id: 'evidence', label: 'Evidence & Reports', allowedRoles: ['HR_ADMIN', 'HR_REVIEWER'] },
  { id: 'testing', label: 'Testing & Monitoring', allowedRoles: ['HR_ADMIN'] },
  { id: 'admin', label: 'Administration', allowedRoles: ['HR_ADMIN'] },
  { id: 'employee', label: 'Employee Portal', allowedRoles: ['EMPLOYEE', 'HR_ADMIN'] },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentUser,
  activeDestination,
  onNavigate,
  onOpenLogin,
  onLogout,
  onOpenHelp,
}) => {
  const currentRole = currentUser?.role || 'HR_ADMIN';

  // Filter items permitted for the active role
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (currentRole === 'EMPLOYEE') {
      return item.id === 'employee';
    }
    if (currentRole === 'HR_REVIEWER') {
      return item.allowedRoles.includes('HR_REVIEWER');
    }
    return item.allowedRoles.includes('HR_ADMIN');
  });

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        height: '64px',
        borderBottom: '1px solid #e2e8f0',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Brand / Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => onNavigate(currentRole === 'EMPLOYEE' ? 'employee' : 'overview')}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            color: '#ffffff',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
          }}
        >
          360
        </div>
        <div>
          <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Employee<span style={{ color: '#2563eb' }}>360 AI</span>
          </div>
          <div
            style={{
              fontSize: '0.68rem',
              color: '#64748b',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Autonomous HR Platform &bull; Zensar
          </div>
        </div>
      </div>

      {/* Primary Role-Aware Destinations */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#f8fafc',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        {visibleItems.map((item) => {
          const isActive = activeDestination === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#2563eb' : '#475569',
                border: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
                borderRadius: '6px',
                padding: '6px 14px',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: '#eff6ff',
                    color: '#2563eb',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Context, Role Switcher, & Help Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onOpenHelp}
          title="System Architecture & Feature Guide"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.92rem',
            fontWeight: 800,
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#2563eb';
            e.currentTarget.style.borderColor = '#2563eb';
            e.currentTarget.style.background = '#eff6ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.background = '#ffffff';
          }}
          aria-label="Help and Feature Guide"
        >
          ?
        </button>

        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                {currentUser.full_name}
              </div>
              <span
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  color: currentUser.role === 'HR_ADMIN' ? '#2563eb' : currentUser.role === 'HR_REVIEWER' ? '#0891b2' : '#16a34a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
            <button
              className="btn-secondary"
              onClick={onOpenLogin}
              title="Switch user role for testing"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            >
              Switch Role
            </button>
            <button
              className="btn-secondary"
              onClick={onLogout}
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={onOpenLogin} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
