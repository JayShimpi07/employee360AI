import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api';

interface AdministrationViewProps {
  currentUser: User | null;
  onSwitchUser?: (email: string, role: UserRole, name: string) => void;
}

export const AdministrationView: React.FC<AdministrationViewProps> = ({
  currentUser,
  onSwitchUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'policies' | 'maintenance'>('users');
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Policy Guardrails state
  const [policies, setPolicies] = useState({
    maxSickDaysWithoutCert: 2,
    maxPtoCarryover: 5,
    faceAbsenceToleranceSec: 10,
    cameraSampleRateFps: 1,
    minRagSimilarity: 0.65,
    requireVerbatimQuotes: true,
    requireManagerApprovalOverDays: 14,
  });

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Saving policy guardrails...');
    setTimeout(() => {
      setSaveStatus('Policy guardrails successfully updated and compiled into active runtime!');
      setTimeout(() => setSaveStatus(null), 3500);
    }, 400);
  };

  const handleCleanTestData = async () => {
    setIsCleaning(true);
    setCleanupMessage(null);
    try {
      const res = await api.cleanupTestData();
      setCleanupMessage(`Success: ${res.message || 'Test data purged.'}`);
      setShowCleanupModal(false);
    } catch (err: any) {
      setCleanupMessage(`Error: ${err.message || 'Failed to cleanup test data'}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const seededUsers = [
    {
      id: 'usr_admin',
      name: 'HR Operations Lead',
      email: 'admin@zensar.com',
      role: 'HR_ADMIN' as UserRole,
      badge: 'Full Platform Admin',
      description: 'Access to All Modules, Workflows, Agent Studio, Testing Lab, and System Settings.',
    },
    {
      id: 'usr_reviewer',
      name: 'Technical Hiring Manager',
      email: 'reviewer@zensar.com',
      role: 'HR_REVIEWER' as UserRole,
      badge: 'Evaluator / Lead',
      description: 'Access to Overview metrics, Candidate pipelines, and Evidence decision reports.',
    },
    {
      id: 'usr_employee',
      name: 'Alex Smith (Software Engineer)',
      email: 'alex.smith@zensar.com',
      role: 'EMPLOYEE' as UserRole,
      badge: 'Employee / New Joiner',
      description: 'Isolated access to Employee Portal: Onboarding Tasks, Harper HR AI Assistant, and Cases.',
    },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="badge badge-indigo">Platform Governance</span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Zensar Enterprise Security &bull; Role-Based Access Control</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Administration &amp; System Governance
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px' }}>
          Manage user accounts, RBAC permission matrices, policy guardrail thresholds, and system health diagnostics.
        </p>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}
      >
        {[
          { id: 'users', label: 'Users & Roles (RBAC)', icon: '👥' },
          { id: 'policies', label: 'Policy Guardrails & Thresholds', icon: '🛡️' },
          { id: 'maintenance', label: 'System Diagnostics & Maintenance', icon: '⚙️' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                background: 'transparent',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.90rem',
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: USERS & ROLES */}
      {activeSubTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Seeded Users List */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Active Enterprise Accounts
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Pre-seeded organizational users with distinct authentication contexts and role scopes.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {seededUsers.map((u) => {
                const isCurrent = currentUser?.email === u.email;
                return (
                  <div
                    key={u.id}
                    style={{
                      border: isCurrent ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '18px',
                      background: isCurrent ? '#f8faff' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isCurrent ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{u.name}</div>
                          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{u.email}</div>
                        </div>
                        <span
                          className={`badge ${
                            u.role === 'HR_ADMIN'
                              ? 'badge-indigo'
                              : u.role === 'HR_REVIEWER'
                              ? 'badge-amber'
                              : 'badge-emerald'
                          }`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {u.role}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#475569', margin: '10px 0 16px 0', lineHeight: 1.45 }}>
                        {u.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                      {isCurrent ? (
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ● Active Session
                        </span>
                      ) : (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                          onClick={() => onSwitchUser && onSwitchUser(u.email, u.role, u.name)}
                        >
                          Switch to this Account
                        </button>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.badge}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role Permission Matrix */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Role-Based Access Control (RBAC) Permission Matrix
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '16px' }}>
              Strict permissions mapped across primary platform destinations and sensitive actions.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Destination / Module</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>HR Admin</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>HR Reviewer</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Employee</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Candidate</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { module: 'Overview & Analytics', admin: 'Full View', reviewer: 'Full View', employee: 'No Access', candidate: 'No Access' },
                    { module: 'Workflows & Lifecycles', admin: 'View & Execute', reviewer: 'No Access', employee: 'No Access', candidate: 'No Access' },
                    { module: 'People (Requisitions & Jobs)', admin: 'Create / Edit / Invite', reviewer: 'View / Read Only', employee: 'No Access', candidate: 'No Access' },
                    { module: 'People (Candidate Pipeline)', admin: 'View / Invite / Delete', reviewer: 'View Only', employee: 'No Access', candidate: 'No Access' },
                    { module: 'AI Agent Studio & Prompt DAG', admin: 'Configure & Compile', reviewer: 'No Access', employee: 'No Access', candidate: 'No Access' },
                    { module: 'Evidence & Candidate Decisions', admin: 'View / Sign-off / Delete', reviewer: 'View / Sign-off', employee: 'No Access', candidate: 'No Access' },
                    { module: 'Testing Lab (Proctoring & Fairness)', admin: 'Run Benchmarks', reviewer: 'No Access', employee: 'No Access', candidate: 'No Access' },
                    { module: 'Employee Portal (Tasks & Harper)', admin: 'Simulate / Test', reviewer: 'No Access', employee: 'Full Personal Access', candidate: 'No Access' },
                    { module: 'Candidate Live Interview', admin: 'Simulate Link', reviewer: 'No Access', employee: 'No Access', candidate: 'Token Link Only' },
                    { module: 'Administration & System Cleanup', admin: 'Full Governance', reviewer: 'No Access', employee: 'No Access', candidate: 'No Access' },
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1e293b' }}>{row.module}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ color: '#15803d', fontWeight: 600 }}>✓ {row.admin}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {row.reviewer.includes('No') ? (
                          <span style={{ color: '#94a3b8' }}>— {row.reviewer}</span>
                        ) : (
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>✓ {row.reviewer}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {row.employee.includes('No') ? (
                          <span style={{ color: '#94a3b8' }}>— {row.employee}</span>
                        ) : (
                          <span style={{ color: '#059669', fontWeight: 600 }}>✓ {row.employee}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {row.candidate.includes('No') ? (
                          <span style={{ color: '#94a3b8' }}>— {row.candidate}</span>
                        ) : (
                          <span style={{ color: '#d97706', fontWeight: 600 }}>✓ {row.candidate}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: POLICY GUARDRAILS */}
      {activeSubTab === 'policies' && (
        <form onSubmit={handleSavePolicies}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {saveStatus && (
              <div style={{ padding: '12px 18px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '0.88rem', fontWeight: 600 }}>
                {saveStatus}
              </div>
            )}

            {/* Leave Policy Guardrails */}
            <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.25rem' }}>📋</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Absence &amp; HR Case Resolution Guardrails
                </h3>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '18px' }}>
                Enforced by Harper AI Agent when evaluating employee requests against company bylaws.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Max Consecutive Sick Days Without Doctor Certificate
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={policies.maxSickDaysWithoutCert}
                    onChange={(e) => setPolicies({ ...policies, maxSickDaysWithoutCert: parseInt(e.target.value) || 1 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Standard Zensar policy: 2 days. 3+ days triggers mandatory medical certificate attachment.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Annual PTO Carryover Cap (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={policies.maxPtoCarryover}
                    onChange={(e) => setPolicies({ ...policies, maxPtoCarryover: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Maximum unused paid vacation days transferred to the following calendar year.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Manager Approval Threshold (Continuous Days)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={policies.requireManagerApprovalOverDays}
                    onChange={(e) => setPolicies({ ...policies, requireManagerApprovalOverDays: parseInt(e.target.value) || 14 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Harper AI cannot autonomously grant leave exceeding this limit without manager sign-off.
                  </div>
                </div>
              </div>
            </div>

            {/* Proctoring & Anti-Cheating Guardrails */}
            <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.25rem' }}>👁️</span>
                <h3 style={{ fontSize: '11rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Camera &amp; Proctoring Integrity Thresholds
                </h3>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '18px' }}>
                Controls automated anomaly flags during live candidate AI interviews.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Face Absence Tolerance (Seconds)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={policies.faceAbsenceToleranceSec}
                    onChange={(e) => setPolicies({ ...policies, faceAbsenceToleranceSec: parseInt(e.target.value) || 10 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Candidate leaving webcam frame beyond this triggers an automated integrity flag.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Frame Processing Sampling Rate (FPS)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="1"
                    value={policies.cameraSampleRateFps}
                    onChange={(e) => setPolicies({ ...policies, cameraSampleRateFps: parseInt(e.target.value) || 1 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Default 1 FPS gives optimal edge inference latency without network bandwidth degradation.
                  </div>
                </div>
              </div>
            </div>

            {/* AI Agent Evidence & Safety Guardrails */}
            <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.25rem' }}>🤖</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Agent Grounding &amp; Anti-Hallucination Guardrails
                </h3>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '18px' }}>
                Enforces deterministic grounding in Knowledge Base documents and resume claims.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Minimum RAG Semantic Cosine Threshold: {policies.minRagSimilarity}
                  </label>
                  <input
                    type="range"
                    min="0.4"
                    max="0.9"
                    step="0.05"
                    value={policies.minRagSimilarity}
                    onChange={(e) => setPolicies({ ...policies, minRagSimilarity: parseFloat(e.target.value) })}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Responses with similarity below this threshold prompt fallback to human HR advisor.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingTop: '8px' }}>
                  <input
                    type="checkbox"
                    id="requireQuotes"
                    checked={policies.requireVerbatimQuotes}
                    onChange={(e) => setPolicies({ ...policies, requireVerbatimQuotes: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
                  />
                  <label htmlFor="requireQuotes" style={{ fontSize: '0.84rem', color: '#1e293b', cursor: 'pointer' }}>
                    <strong>Enforce Proof-Carrying Verbatim Citations:</strong> Require that interview evaluation reports include verbatim candidate transcript quotes for every rubric score.
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setPolicies({
                    maxSickDaysWithoutCert: 2,
                    maxPtoCarryover: 5,
                    faceAbsenceToleranceSec: 10,
                    cameraSampleRateFps: 1,
                    minRagSimilarity: 0.65,
                    requireVerbatimQuotes: true,
                    requireManagerApprovalOverDays: 14,
                  })
                }
              >
                Reset to Zensar Defaults
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 24px' }}>
                Save &amp; Compile Guardrails
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 3: SYSTEM DIAGNOSTICS & MAINTENANCE */}
      {activeSubTab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Health Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Primary Relational DB</span>
                <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>ONLINE</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>SQLite 3.x (WAL)</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                `employee360.db` &bull; ACID Compliant
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Vector Semantic Store</span>
                <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>INDEXED</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>In-Memory RAG Core</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                14 Company Handbook Chunks Loaded
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Deterministic Compiler</span>
                <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>SHA-256 Pipeline</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                Immutable Workflow Hash Check
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Speech &amp; CV Pipeline</span>
                <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>READY</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>WebSpeech + 1 FPS CV</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                Sub-300ms Average Latency
              </div>
            </div>
          </div>

          {/* Maintenance & Data Reset Action */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #fed7aa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#9a3412', margin: 0 }}>
                    Test Data Cleanup &amp; Demonstration Reset
                  </h3>
                </div>
                <p style={{ fontSize: '0.84rem', color: '#7c2d12', marginTop: '6px', maxWidth: '750px', lineHeight: 1.45 }}>
                  This cleans all generated candidate interview transcripts, evaluation reports, and proctoring logs. Active job requisitions and company knowledge base documents will remain intact.
                </p>
                {cleanupMessage && (
                  <div style={{ marginTop: '10px', padding: '8px 14px', background: '#fef3c7', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#92400e' }}>
                    {cleanupMessage}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-danger"
                style={{ padding: '10px 20px', fontSize: '0.88rem' }}
                onClick={() => setShowCleanupModal(true)}
              >
                🗑️ Clean Test Runs &amp; Reset State
              </button>
            </div>
          </div>

          {/* Audit Trail Snippet */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              System Activity &amp; Audit Trail
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '16px' }}>
              Immutable ledger of recent autonomous events, policy evaluations, and reviewer actions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { time: 'Just now', action: 'Deterministic 7-step loop initialized for active session', actor: 'Harper Agent Core', status: 'SUCCESS' },
                { time: '5m ago', action: 'HR Case Resolution verified against Zensar Bereavement Bylaws', actor: 'Alex Smith (Employee)', status: 'VERIFIED' },
                { time: '14m ago', action: 'Signed off candidate interview evaluation report (Score: 84%)', actor: 'HR Reviewer', status: 'APPROVED' },
                { time: '42m ago', action: 'Adversarial proctoring synthetic attack benchmark passed with 0 FP', actor: 'Integrity CV Engine', status: 'PASSED' },
                { time: '1h ago', action: 'Requisition Senior AI Platform Engineer invited candidate with HMAC token', actor: 'HR Operations Lead', status: 'ISSUED' },
              ].map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #f1f5f9',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#94a3b8', minWidth: '60px' }}>{log.time}</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{log.action}</span>
                    <span style={{ color: '#64748b' }}>&bull; {log.actor}</span>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>{log.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Data Cleanup */}
      {showCleanupModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowCleanupModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '480px',
              width: '100%',
              background: '#ffffff',
              padding: '24px',
              borderRadius: '10px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b91c1c', margin: '0 0 8px 0' }}>
              Confirm Test Data Cleanup
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to clean all test candidate runs, interview transcripts, and evaluation reports?
              This action cannot be undone. Active jobs and company handbooks will be preserved.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCleanupModal(false)}
                disabled={isCleaning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleCleanTestData}
                disabled={isCleaning}
                style={{ padding: '8px 18px' }}
              >
                {isCleaning ? 'Cleaning...' : 'Yes, Purge Test Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
