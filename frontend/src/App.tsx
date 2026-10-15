import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { WorkflowStudio } from './components/WorkflowStudio';
import { CandidateInterview } from './components/CandidateInterview';
import { EvidenceDecisionCenter } from './components/EvidenceDecisionCenter';
import { LoginModal } from './components/LoginModal';
import { api, getStoredToken, setStoredToken } from './api';
import { User } from './types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'studio' | 'interview' | 'evidence'>('dashboard');
  const [interviewToken, setInterviewToken] = useState<string>('');
  const [interviewEmail, setInterviewEmail] = useState<string>('');

  useEffect(() => {
    // Check URL parameters for candidate interview invite link
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const emailParam = params.get('email');
    if (tokenParam && emailParam) {
      setInterviewToken(tokenParam);
      setInterviewEmail(emailParam);
      setActiveTab('interview');
    }

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
        ) : activeTab === 'studio' ? (
          <WorkflowStudio />
        ) : activeTab === 'evidence' ? (
          <EvidenceDecisionCenter currentUser={currentUser} />
        ) : (
          <CandidateInterview
            initialToken={interviewToken}
            initialEmail={interviewEmail}
            onExit={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      <footer style={{
        padding: '24px',
        borderTop: '1px solid var(--border-subtle)',
        background: '#ffffff',
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
