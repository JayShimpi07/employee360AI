import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { WorkflowStudio } from './components/WorkflowStudio';
import { LoginModal } from './components/LoginModal';
import { api, getStoredToken, setStoredToken } from './api';
import { User } from './types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'studio'>('dashboard');

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      api.getMe()
        .then(setCurrentUser)
        .catch(() => {
          setStoredToken(null);
          setCurrentUser(null);
        });
    }
  }, []);

  const handleLogout = () => {
    setStoredToken(null);
    setCurrentUser(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main style={{ flex: 1 }}>
        {activeTab === 'dashboard' ? (
          <Dashboard onOpenStudio={() => setActiveTab('studio')} />
        ) : (
          <WorkflowStudio />
        )}
      </main>

      <footer style={{
        padding: '24px',
        borderTop: '1px solid var(--border-subtle)',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
      }}>
        <div>Employee360 AI &copy; 2026 — Final-Year Engineering Capstone for Zensar HR</div>
        <div style={{ marginTop: '4px' }}>Deterministic 7-Step Autonomous Loop &bull; Proof-Carrying Decisions &bull; English Spoken Voice Core</div>
      </footer>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={setCurrentUser}
      />
    </div>
  );
};
