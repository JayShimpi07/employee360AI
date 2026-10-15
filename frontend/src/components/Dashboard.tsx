import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Job, SystemStats, InviteCandidateResponse } from '../types';

interface DashboardProps {
  onOpenStudio: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenStudio }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Candidate Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
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
      const [s, j] = await Promise.all([api.getStats(), api.getJobs()]);
      setStats(s);
      setJobs(j);
      if (j.length > 0) setSelectedJobId(j[0].id);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
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
      // Refresh stats
      const s = await api.getStats();
      setStats(s);
    } catch (err: any) {
      alert(err.message || 'Failed to issue invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Executive Hero Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <span className="badge badge-indigo" style={{ marginBottom: '8px' }}>HR Operations Hub &bull; Zensar</span>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>HR Command Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Autonomous employee lifecycle orchestration, competency rubrics, and proof-carrying interview reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={onOpenStudio}>
            Workflow Studio
          </button>
          <button className="btn-primary" onClick={() => { setIsInviteOpen(true); setInviteResult(null); }}>
            + Invite Candidate for AI Interview
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Active Jobs</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
            {stats?.total_jobs ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Open positions with rubrics</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Interviews Conducted</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '6px', color: '#16a34a' }}>
            {stats?.total_interviews ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Evidence-evaluated sessions</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Active Workflows</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-primary)' }}>
            {stats?.total_workflows ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Hiring, Onboarding, Assistance</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Autonomous Loop</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '10px', color: '#1e293b' }}>
            7-Step Verified
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Proof-carrying decisions</div>
        </div>
      </div>

      {/* Main Section: Job Requisitions & Competencies */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Requisitions & Competency Rubrics</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              Each job is governed by an immutable compiled workflow version and explicit competency criteria.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading requisitions...</div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No jobs found. Seed database to load default engineering jobs.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{job.title}</h3>
                      <span className="badge badge-indigo">{job.department}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '4px' }}>
                      {job.description}
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                    onClick={() => { setSelectedJobId(job.id); setIsInviteOpen(true); setInviteResult(null); }}
                  >
                    Invite Candidate
                  </button>
                </div>

                {/* Competencies Badges */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '8px' }}>
                    Evaluated Competencies ({job.competencies.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                    {job.competencies.map((comp) => (
                      <div
                        key={comp.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>{comp.name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Weight: {comp.weight}x</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {comp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Candidate Modal */}
      {isInviteOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '28px', background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Issue Candidate Interview Invite</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Generates an authenticated HMAC-SHA256 one-time interview link.
                </p>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {inviteResult ? (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <span className="badge badge-emerald" style={{ marginBottom: '8px' }}>Link Generated</span>
                <h3 style={{ fontSize: '1.1rem', color: '#15803d', marginTop: '6px' }}>Interview Invitation Active!</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '8px 0 16px 0' }}>
                  A one-time cryptographically signed link has been created for <strong>{inviteResult.candidate_name}</strong>.
                </p>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: '#0f172a',
                  wordBreak: 'break-all',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}>
                  {inviteResult.invite_url}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteResult.invite_url);
                      alert('Copied interview link to clipboard!');
                    }}
                  >
                    Copy Link
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setIsInviteOpen(false);
                      setInviteResult(null);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>Target Requisition</label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>Candidate Full Name</label>
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>Candidate Email</label>
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                    Candidate Resume Text (for "Defend Your Resume" Claims)
                  </label>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste resume summary or technical claims here..."
                    style={{ width: '100%', minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }} disabled={inviting}>
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
