import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface EvidenceDecisionCenterProps {
  currentUser: User | null;
}

export const EvidenceDecisionCenter: React.FC<EvidenceDecisionCenterProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [signingOff, setSigningOff] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/evidence/reports');
      const data = await res.json();
      setReports(data);
      if (data.length > 0) {
        loadReportDetails(data[0].session_id);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetails = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/v1/evidence/sessions/${sessionId}/report`);
      const data = await res.json();
      setSelectedReport(data);
    } catch (err) {
      console.error('Failed to load report detail', err);
    }
  };

  const handleSignoff = async (statusChoice: 'APPROVED' | 'FLAGGED' | 'REJECTED') => {
    if (!selectedReport) return;
    try {
      setSigningOff(true);
      const token = localStorage.getItem('employee360_token');
      const res = await fetch(`/api/v1/evidence/reports/${selectedReport.report_id}/signoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: statusChoice, notes: reviewerNotes }),
      });
      const updated = await res.json();
      setSelectedReport((prev: any) => ({
        ...prev,
        human_override_status: updated.human_override_status,
        is_finalized: updated.is_finalized,
      }));
      setReviewerNotes('');
      // Refresh list
      const listRes = await fetch('/api/v1/evidence/reports');
      const listData = await listRes.json();
      setReports(listData);
    } catch (err) {
      console.error('Signoff failed', err);
      alert('Signoff recording failed.');
    } finally {
      setSigningOff(false);
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span className="badge badge-emerald" style={{ marginBottom: '8px' }}>Auditable Evaluation</span>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>Evidence & Decision Center</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Inspect Proof-Carrying candidate assessments. Every hiring recommendation is anchored to verified transcript quotes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        {/* Left Column: Candidate Evaluation Reports List */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
              Evaluated Candidates ({reports.length})
            </h3>
            <button className="btn-secondary" onClick={loadReports} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading assessments...</div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.86rem' }}>
              No completed interviews found yet. Conduct an interview in the Candidate Portal to generate proof-carrying evaluations.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reports.map((r) => {
                const isSelected = selectedReport?.report_id === r.report_id;
                return (
                  <div
                    key={r.report_id}
                    onClick={() => loadReportDetails(r.session_id)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>{r.candidate_name}</span>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: r.overall_score >= 75 ? '#16a34a' : r.overall_score >= 50 ? '#d97706' : '#dc2626'
                      }}>
                        {r.overall_score}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                      {r.job_title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${r.human_override_status === 'APPROVED' ? 'badge-emerald' : r.human_override_status === 'FLAGGED' ? 'badge-amber' : 'badge-indigo'}`}>
                        {r.human_override_status || 'PENDING'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Sufficiency: {Math.round(r.evidence_sufficiency_ratio * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Deep-Dive Proof-Carrying Evidence Tree */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          {selectedReport ? (
            <div>
              {/* Report Header & Score Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>{selectedReport.candidate_name}</h2>
                    <span className="badge badge-indigo">{selectedReport.job_title}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
                    Session: <code>{selectedReport.session_id}</code> &bull; Verified Evidence Trail
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '2.1rem',
                    fontWeight: 800,
                    color: selectedReport.overall_score >= 75 ? '#16a34a' : selectedReport.overall_score >= 50 ? '#d97706' : '#dc2626'
                  }}>
                    {selectedReport.overall_score}
                    <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>/100</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Evidence Sufficiency: {Math.round(selectedReport.evidence_sufficiency_ratio * 100)}%
                  </div>
                </div>
              </div>

              {/* Recommendation Narrative Alert */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '28px',
                fontSize: '0.90rem',
                lineHeight: '1.5',
                color: '#1e3a8a',
              }}>
                <strong style={{ color: '#1d4ed8', display: 'block', marginBottom: '4px' }}>
                  AI Recommendation & Synthesis:
                </strong>
                {selectedReport.recommendation_narrative}
              </div>

              {/* Competency Evidence Citations */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Proof-Carrying Competency Breakdown</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 400 }}>(Requirement → Transcript Quote → Score)</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {Object.entries(selectedReport.competency_breakdown || {}).map(([compName, compData]: [string, any]) => (
                    <div
                      key={compName}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>{compName}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '10px' }}>
                            Weight: {compData.weight}x
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`badge ${compData.status === 'SUPPORTED' ? 'badge-emerald' : compData.status === 'PARTIAL' ? 'badge-amber' : 'badge-rose'}`}>
                            {compData.status} ({compData.score}%)
                          </span>
                        </div>
                      </div>

                      {/* Evidence Citation Quote */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: '3px solid var(--accent-primary)',
                        padding: '10px 14px',
                        borderRadius: '0 6px 6px 0',
                        fontSize: '0.84rem',
                        color: 'var(--text-main)',
                        fontStyle: 'italic',
                      }}>
                        "{compData.evidence_quote}"
                        {compData.turn_index && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', fontStyle: 'normal' }}>
                            Captured in Turn #{compData.turn_index}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviewer Sign-Off Action Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Human-in-the-Loop Reviewer Sign-off</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Signed in as: {currentUser?.full_name || 'Lead HR Reviewer'} ({currentUser?.role || 'REVIEWER'})
                    </span>
                  </div>
                  <span className={`badge ${selectedReport.is_finalized ? 'badge-emerald' : 'badge-amber'}`}>
                    {selectedReport.human_override_status || 'PENDING_REVIEW'}
                  </span>
                </div>

                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Optional review notes, mentor comments, or rationale for decision..."
                  style={{ width: '100%', minHeight: '60px', marginBottom: '14px', fontFamily: 'inherit' }}
                />

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => handleSignoff('REJECTED')}
                    disabled={signingOff}
                    style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                  >
                    Reject Assessment
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => handleSignoff('FLAGGED')}
                    disabled={signingOff}
                    style={{ color: '#b45309', borderColor: '#fde68a' }}
                  >
                    Flag for Human Interview
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => handleSignoff('APPROVED')}
                    disabled={signingOff}
                  >
                    {signingOff ? 'Recording...' : 'Approve & Finalize Assessment ✓'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-dim)' }}>
              Select a candidate report on the left to view the proof-carrying evidence tree.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
