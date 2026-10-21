import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Job, User, InviteCandidateResponse } from '../types';

interface PeopleViewProps {
  currentUser: User | null;
  onStartInterview?: (token: string, email: string) => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({ currentUser, onStartInterview }) => {
  const [subTab, setSubTab] = useState<'jobs' | 'candidates' | 'employees'>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recentInvites, setRecentInvites] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteCandidateResponse | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jList, invList] = await Promise.all([
        api.getJobs(),
        fetch('/api/v1/auth/candidate/recent-invites').then((r) => r.json()).catch(() => []),
      ]);
      setJobs(jList);
      if (Array.isArray(invList)) setRecentInvites(invList);
      if (jList.length > 0) setSelectedJobId(jList[0].id);

      // Seeded sample employee directory
      setEmployees([
        {
          id: 'emp-101',
          name: 'Alex Smith',
          email: 'alex.smith@zensar.com',
          role: 'Full Stack Engineer',
          department: 'Engineering',
          status: 'ONBOARDING',
          onboardingProgress: 67,
          joinedDate: '2026-10-15',
        },
        {
          id: 'emp-102',
          name: 'Arjun Sharma',
          email: 'arjun.sharma@zensar.com',
          role: 'Senior Full Stack Engineer',
          department: 'Engineering',
          status: 'ACTIVE',
          onboardingProgress: 100,
          joinedDate: '2026-09-01',
        },
      ]);
    } catch (err) {
      console.error('Failed to load people data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !candidateName || !candidateEmail) return;

    try {
      setInviting(true);
      const res = await api.inviteCandidate({
        job_id: selectedJobId,
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        resume_text: resumeText,
      });
      setInviteResult(res);
      // Reload candidates
      const invList = await fetch('/api/v1/auth/candidate/recent-invites').then((r) => r.json());
      if (Array.isArray(invList)) setRecentInvites(invList);
    } catch (err: any) {
      alert(err.message || 'Failed to issue invite');
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteCandidate = async (sessionId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the candidate interview session for ${name}?`)) return;
    try {
      await api.deleteInterviewSession(sessionId);
      setRecentInvites((prev) => prev.filter((i) => i.session_id !== sessionId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete candidate session');
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <span className="badge badge-indigo" style={{ marginBottom: '8px' }}>Human Capital & Pipeline</span>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            People & Talent Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '4px' }}>
            Manage job requisitions, candidate evaluation pipelines, and active employee records with role-based governance.
            {loading && <span style={{ marginLeft: '12px', fontSize: '0.80rem', color: '#2563eb' }}>● Syncing live directory...</span>}
          </p>
        </div>

        {currentUser?.role === 'HR_ADMIN' && (
          <button
            className="btn-primary"
            onClick={() => {
              setIsInviteOpen(true);
              setInviteResult(null);
            }}
          >
            + Invite Candidate for AI Assessment
          </button>
        )}
      </div>

      {/* Sub-Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={() => setSubTab('jobs')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: subTab === 'jobs' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'jobs' ? '#2563eb' : '#64748b',
            fontWeight: subTab === 'jobs' ? 700 : 500,
            fontSize: '0.90rem',
            cursor: 'pointer',
          }}
        >
          Job Requisitions ({jobs.length})
        </button>
        <button
          onClick={() => setSubTab('candidates')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: subTab === 'candidates' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'candidates' ? '#2563eb' : '#64748b',
            fontWeight: subTab === 'candidates' ? 700 : 500,
            fontSize: '0.90rem',
            cursor: 'pointer',
          }}
        >
          Active Candidates ({recentInvites.length})
        </button>
        <button
          onClick={() => setSubTab('employees')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: subTab === 'employees' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'employees' ? '#2563eb' : '#64748b',
            fontWeight: subTab === 'employees' ? 700 : 500,
            fontSize: '0.90rem',
            cursor: 'pointer',
          }}
        >
          Employees ({employees.length})
        </button>
      </div>

      {/* TAB 1: JOB REQUISITIONS */}
      {subTab === 'jobs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              className="glass-panel"
              style={{
                padding: '24px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {job.title}
                  </h2>
                  <span className="badge badge-indigo">{job.department}</span>
                </div>
                {currentUser?.role === 'HR_ADMIN' && (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setIsInviteOpen(true);
                      setInviteResult(null);
                    }}
                    style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                  >
                    + Issue Invitation
                  </button>
                )}
              </div>

              <p style={{ color: '#475569', fontSize: '0.90rem', marginBottom: '16px' }}>
                {job.description}
              </p>

              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Evaluated Competencies ({job.competencies.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {job.competencies.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{c.name}</span>
                        <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                          Weight: {c.weight}x
                        </span>
                      </div>
                      <p style={{ fontSize: '0.80rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                        {c.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: ACTIVE CANDIDATES */}
      {subTab === 'candidates' && (
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Candidate Pipeline & Interview Sessions
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                All cryptographically signed interview sessions generated for active requisitions.
              </p>
            </div>
            <button className="btn-secondary" onClick={loadData} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
              Refresh
            </button>
          </div>

          {recentInvites.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '0.90rem' }}>
              No active candidates found. Click "+ Invite Candidate" to create a secure interview invitation.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '10px 14px' }}>Candidate Name</th>
                    <th style={{ padding: '10px 14px' }}>Email Address</th>
                    <th style={{ padding: '10px 14px' }}>Target Requisition</th>
                    <th style={{ padding: '10px 14px' }}>Interview Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvites.map((cand) => (
                    <tr key={cand.session_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {cand.candidate_name}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontFamily: 'monospace' }}>
                        {cand.candidate_email}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge badge-indigo">{cand.job_title}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${cand.status === 'COMPLETED' ? 'badge-emerald' : 'badge-amber'}`}>
                          {cand.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          {onStartInterview && (
                            <button
                              className="btn-secondary"
                              onClick={() => onStartInterview(cand.invite_token, cand.candidate_email)}
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              Launch Room &rarr;
                            </button>
                          )}
                          {currentUser?.role === 'HR_ADMIN' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCandidate(cand.session_id, cand.candidate_name)}
                              title="Delete candidate session"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#94a3b8',
                                padding: '4px',
                                fontSize: '0.88rem',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EMPLOYEES */}
      {subTab === 'employees' && (
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Active Workforce & Onboarding Progress
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
            Employees managed by the autonomous onboarding and assistance workflows.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '10px 14px' }}>Employee</th>
                  <th style={{ padding: '10px 14px' }}>Role & Dept</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Onboarding Completion</th>
                  <th style={{ padding: '10px 14px' }}>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{emp.email}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div>{emp.role}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{emp.department}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${emp.onboardingProgress}%`, height: '100%', background: emp.onboardingProgress === 100 ? '#16a34a' : '#2563eb' }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{emp.onboardingProgress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{emp.joinedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Candidate Modal */}
      {isInviteOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              background: '#ffffff',
              padding: '28px',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Issue Candidate Interview Invite</h2>
                <p style={{ fontSize: '0.80rem', color: '#64748b' }}>Generates an authenticated HMAC-SHA256 one-time interview link.</p>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {inviteResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '8px', color: '#15803d', fontSize: '0.88rem' }}>
                  <strong>Interview Invitation Active!</strong> Created for <strong>{inviteResult.candidate_name}</strong>.
                </div>

                {onStartInterview && (
                  <button
                    className="btn-primary"
                    style={{ background: '#16a34a', borderColor: '#15803d', padding: '10px 16px', fontWeight: 700 }}
                    onClick={() => {
                      onStartInterview(inviteResult.invite_token, inviteResult.candidate_email);
                      setIsInviteOpen(false);
                      setInviteResult(null);
                    }}
                  >
                    🚀 Launch Interview as Candidate (1-Click)
                  </button>
                )}

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Direct Candidate Invitation URL:
                  </label>
                  <textarea
                    readOnly
                    value={`${window.location.origin}/?token=${inviteResult.invite_token}&email=${encodeURIComponent(inviteResult.candidate_email)}`}
                    onFocus={(e) => e.target.select()}
                    rows={2}
                    style={{
                      width: '100%',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      resize: 'none',
                    }}
                  />
                </div>

                <button className="btn-secondary" onClick={() => setIsInviteOpen(false)} style={{ marginTop: '8px' }}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>Target Requisition</label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>Candidate Full Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>Candidate Email Address</label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="maya.lin@example.com"
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Candidate Resume Text (for "Defend Your Resume" Claims)
                  </label>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste resume summary or technical claims here..."
                    style={{ width: '100%', minHeight: '80px' }}
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={inviting}>
                  {inviting ? 'Generating Cryptographic Invitation...' : 'Generate & Issue Secure Invite'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
