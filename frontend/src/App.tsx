import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, NavDestination } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { WorkflowsView } from './components/WorkflowsView';
import { PeopleView } from './components/PeopleView';
import { AIAgentView } from './components/AIAgentView';
import { EvidenceDecisionCenter } from './components/EvidenceDecisionCenter';
import { TestingMonitoringView } from './components/TestingMonitoringView';
import { AdministrationView } from './components/AdministrationView';
import { EmployeePortal } from './components/EmployeePortal';
import { CandidateInterview } from './components/CandidateInterview';
import { HelpModal } from './components/HelpModal';
import { LoginModal } from './components/LoginModal';
import { api, getStoredToken, setStoredToken } from './api';
import { User, UserRole } from './types';

const VALID_DESTINATIONS: NavDestination[] = [
  'overview',
  'workflows',
  'people',
  'agent',
  'evidence',
  'testing',
  'admin',
  'employee',
];

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeDestination, setActiveDestination] = useState<NavDestination>('overview');

  // Candidate mode isolation
  const [isCandidateMode, setIsCandidateMode] = useState<boolean>(false);
  const [interviewToken, setInterviewToken] = useState<string>('');
  const [interviewEmail, setInterviewEmail] = useState<string>('');

  // Destination permission validator
  const isDestinationPermitted = useCallback((dest: NavDestination, role?: UserRole): boolean => {
    const currentRole = role || currentUser?.role || 'HR_ADMIN';
    if (currentRole === 'EMPLOYEE') {
      return dest === 'employee';
    }
    if (currentRole === 'HR_REVIEWER') {
      return dest === 'overview' || dest === 'people' || dest === 'evidence';
    }
    return true; // HR_ADMIN has access to all
  }, [currentUser?.role]);

  // Handle destination navigation with URL hash update
  const handleNavigate = useCallback((dest: NavDestination) => {
    if (isCandidateMode) {
      setIsCandidateMode(false);
      setInterviewToken('');
      setInterviewEmail('');
    }

    if (!isDestinationPermitted(dest)) {
      if (currentUser?.role === 'EMPLOYEE') {
        dest = 'employee';
      } else if (currentUser?.role === 'HR_REVIEWER') {
        dest = 'overview';
      }
    }

    setActiveDestination(dest);
    window.location.hash = `#${dest}`;
  }, [currentUser?.role, isCandidateMode, isDestinationPermitted]);

  // Synchronize with URL query params and hash on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const emailParam = params.get('email');

    if (tokenParam) {
      setInterviewToken(tokenParam);
      setInterviewEmail(emailParam || 'candidate@example.com');
      setIsCandidateMode(true);
      window.location.hash = '#interview';
      return;
    }

    const syncHash = () => {
      const hash = window.location.hash.replace('#', '') as NavDestination;
      if (hash === ('interview' as any)) {
        setIsCandidateMode(true);
      } else if (VALID_DESTINATIONS.includes(hash)) {
        setIsCandidateMode(false);
        setActiveDestination(hash);
      }
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  // Role enforcement redirect
  useEffect(() => {
    if (currentUser?.role === 'EMPLOYEE' && activeDestination !== 'employee') {
      setActiveDestination('employee');
      window.location.hash = '#employee';
    } else if (currentUser?.role === 'HR_REVIEWER' && !['overview', 'people', 'evidence'].includes(activeDestination)) {
      setActiveDestination('overview');
      window.location.hash = '#overview';
    }
  }, [currentUser?.role, activeDestination]);

  // Initial authentication check
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      api.getMe()
        .then(setCurrentUser)
        .catch(() => {
          setStoredToken(null);
          // Default login as admin
          api.login('admin@zensar.com', 'admin123')
            .then(res => {
              setStoredToken(res.access_token);
              api.getMe().then(setCurrentUser);
            })
            .catch(console.error);
        });
    } else {
      api.login('admin@zensar.com', 'admin123')
        .then(res => {
          setStoredToken(res.access_token);
          api.getMe().then(setCurrentUser);
        })
        .catch(console.error);
    }
  }, []);

  const handleLogout = () => {
    setStoredToken(null);
    setCurrentUser(null);
    setIsCandidateMode(false);
    setIsLoginOpen(true);
  };

  const handleStartInterview = (token: string, email: string) => {
    setInterviewToken(token);
    setInterviewEmail(email);
    setIsCandidateMode(true);
    window.location.hash = '#interview';
  };

  const handleExitInterview = () => {
    setIsCandidateMode(false);
    setInterviewToken('');
    setInterviewEmail('');
    handleNavigate(currentUser?.role === 'EMPLOYEE' ? 'employee' : 'overview');
  };

  const handleSwitchAccount = async (email: string, _role: UserRole, _name: string) => {
    try {
      const password = email === 'admin@zensar.com' ? 'admin123' : 'demo123';
      const res = await api.login(email, password);
      setStoredToken(res.access_token);
      const user = await api.getMe();
      setCurrentUser(user);

      if (user.role === 'EMPLOYEE') {
        setActiveDestination('employee');
        window.location.hash = '#employee';
      } else {
        setActiveDestination('overview');
        window.location.hash = '#overview';
      }
    } catch (err) {
      console.error('Failed to switch user account', err);
    }
  };

  // CANDIDATE ISOLATED PORTAL: Zero navigation bar or company metrics
  if (isCandidateMode) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <CandidateInterview
          initialToken={interviewToken}
          initialEmail={interviewEmail}
          onExit={handleExitInterview}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Primary Role-Aware Navigation */}
      <Navigation
        currentUser={currentUser}
        activeDestination={activeDestination}
        onNavigate={handleNavigate}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Dynamic Workspace Content */}
      <main style={{ flex: 1 }}>
        {activeDestination === 'overview' && (
          <Dashboard
            onOpenStudio={() => handleNavigate('agent')}
            onStartInterview={handleStartInterview}
          />
        )}

        {activeDestination === 'workflows' && (
          <WorkflowsView
            onNavigateToAgent={() => handleNavigate('agent')}
            onNavigateToCandidates={() => handleNavigate('people')}
          />
        )}

        {activeDestination === 'people' && (
          <PeopleView
            currentUser={currentUser}
            onStartInterview={handleStartInterview}
          />
        )}

        {activeDestination === 'agent' && (
          <AIAgentView />
        )}

        {activeDestination === 'evidence' && (
          <EvidenceDecisionCenter currentUser={currentUser} />
        )}

        {activeDestination === 'testing' && (
          <TestingMonitoringView />
        )}

        {activeDestination === 'admin' && (
          <AdministrationView
            currentUser={currentUser}
            onSwitchUser={handleSwitchAccount}
          />
        )}

        {activeDestination === 'employee' && (
          <EmployeePortal />
        )}
      </main>

      {/* Corporate Enterprise Footer */}
      <footer
        style={{
          padding: '20px 32px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          textAlign: 'center',
          fontSize: '0.80rem',
          color: '#64748b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <strong style={{ color: '#1e293b' }}>Employee360 AI &copy; 2026</strong>
          <span>&bull;</span>
          <span>Final-Year Engineering Capstone for Zensar HR</span>
          <span>&bull;</span>
          <span style={{ color: '#2563eb', fontWeight: 600 }}>Deterministic 7-Step Autonomous Loop</span>
          <span>&bull;</span>
          <span>Proof-Carrying Decisions</span>
        </div>
      </footer>

      {/* Help & Architecture Guide Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Enterprise Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'EMPLOYEE') {
            setActiveDestination('employee');
            window.location.hash = '#employee';
          }
        }}
      />
    </div>
  );
};
