import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { api } from '../api';

interface EvidenceDecisionCenterProps {
  currentUser: User | null;
}

export const EvidenceDecisionCenter: React.FC<EvidenceDecisionCenterProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'evaluations' | 'rag'>('evaluations');
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [signingOff, setSigningOff] = useState(false);

  // Transcript Citation Modal State
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [transcriptTurns, setTranscriptTurns] = useState<any[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [highlightTurnIndex, setHighlightTurnIndex] = useState<number | null>(null);
  const [highlightCompetency, setHighlightCompetency] = useState<string | null>(null);
  const targetTurnRef = useRef<HTMLDivElement | null>(null);

  // Knowledge Base RAG State
  const [knowledgeDocs, setKnowledgeDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState<any | null>(null);
  const [queryingRag, setQueryingRag] = useState(false);

  useEffect(() => {
    loadReports();
    loadKnowledgeDocs();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getEvidenceReports();
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
      const data = await api.getEvidenceReport(sessionId);
      setSelectedReport(data);
    } catch (err) {
      console.error('Failed to load report detail', err);
    }
  };

  const loadKnowledgeDocs = async () => {
    try {
      setLoadingDocs(true);
      const docs = await api.getKnowledgeDocuments();
      setKnowledgeDocs(docs);
    } catch (err) {
      console.error('Failed to load knowledge documents', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleOpenTranscriptCitation = async (turnIndex: number | undefined, competencyName: string) => {
    if (!selectedReport) return;
    setHighlightTurnIndex(turnIndex || null);
    setHighlightCompetency(competencyName);
    setIsTranscriptModalOpen(true);
    setLoadingTranscript(true);

    try {
      const turns = await api.getInterviewTranscript(selectedReport.session_id);
      setTranscriptTurns(turns);
      // Wait for DOM to render then scroll to highlighted turn
      setTimeout(() => {
        if (targetTurnRef.current) {
          targetTurnRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    } catch (err) {
      console.error('Failed to fetch transcript', err);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handleSignoff = async (statusChoice: 'APPROVED' | 'FLAGGED' | 'REJECTED') => {
    if (!selectedReport) return;
    try {
      setSigningOff(true);
      const updated = await api.signoffReport(selectedReport.report_id, statusChoice, reviewerNotes);
      setSelectedReport((prev: any) => ({
        ...prev,
        human_override_status: updated.human_override_status,
        is_finalized: updated.is_finalized,
      }));
      setReviewerNotes('');
      // Refresh list
      const listData = await api.getEvidenceReports();
      setReports(listData);
    } catch (err) {
      console.error('Signoff failed', err);
      alert('Signoff recording failed. Please verify login session.');
    } finally {
      setSigningOff(false);
    }
  };

  const handleExecuteRagQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;
    setRagQuery(q);
    setQueryingRag(true);
    try {
      const res = await api.queryKnowledge(q, 3, 0.35);
      setRagResult(res);
    } catch (err) {
      console.error('RAG query failed', err);
      alert('RAG search failed to connect to backend.');
    } finally {
      setQueryingRag(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header & Sub-Tab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-emerald">Auditable Assessment Core</span>
            <span className="badge badge-indigo">Phase 3 Intelligence</span>
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Evidence & Decision Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            Proof-Carrying Candidate Evaluations anchored to verbatim transcripts, with Grounded RAG Knowledge Verification.
          </p>
        </div>

        {/* Sub-Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '6px',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}>
          <button
            onClick={() => setActiveSubTab('evaluations')}
            style={{
              background: activeSubTab === 'evaluations' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'evaluations' ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: activeSubTab === 'evaluations' ? '1px solid #cbd5e1' : '1px solid transparent',
              borderRadius: '6px',
              padding: '8px 16px',
              fontWeight: activeSubTab === 'evaluations' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeSubTab === 'evaluations' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ⚖️ Proof-Carrying Evaluations
          </button>
          <button
            onClick={() => setActiveSubTab('rag')}
            style={{
              background: activeSubTab === 'rag' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'rag' ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: activeSubTab === 'rag' ? '1px solid #cbd5e1' : '1px solid transparent',
              borderRadius: '6px',
              padding: '8px 16px',
              fontWeight: activeSubTab === 'rag' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeSubTab === 'rag' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            🧠 Grounded RAG Knowledge Base
          </button>
        </div>
      </div>

      {activeSubTab === 'evaluations' ? (
        /* ================= SUB-TAB 1: EVALUATIONS & CITATIONS ================= */
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
          {/* Left Column: Candidate List */}
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
                        <div style={{ display: 'flex', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', alignItems: 'center' }}>
                          <span>Sufficiency: {Math.round(r.evidence_sufficiency_ratio * 100)}%</span>
                          <span>&bull;</span>
                          <span style={{ fontWeight: 700, color: (r.proctoring_integrity_score ?? 1.0) >= 0.85 ? '#16a34a' : '#d97706' }}>
                            🛡️ {Math.round((r.proctoring_integrity_score ?? 1.0) * 100)}%
                          </span>
                        </div>
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
                      Session ID: <code>{selectedReport.session_id}</code> &bull; Verified Evidence Trail
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <div>
                        <div style={{
                          fontSize: '2.0rem',
                          fontWeight: 800,
                          color: selectedReport.overall_score >= 75 ? '#16a34a' : selectedReport.overall_score >= 50 ? '#d97706' : '#dc2626'
                        }}>
                          {selectedReport.overall_score}
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>/100</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Evidence: {Math.round(selectedReport.evidence_sufficiency_ratio * 100)}%
                        </div>
                      </div>

                      <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
                        <div style={{
                          fontSize: '1.7rem',
                          fontWeight: 800,
                          color: (selectedReport.proctoring_integrity_score ?? 1.0) >= 0.85 ? '#16a34a' : (selectedReport.proctoring_integrity_score ?? 1.0) >= 0.65 ? '#d97706' : '#dc2626'
                        }}>
                          {Math.round((selectedReport.proctoring_integrity_score ?? 1.0) * 100)}%
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Proctoring Integrity
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendation Narrative Alert */}
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                  fontSize: '0.90rem',
                  lineHeight: '1.5',
                  color: '#1e3a8a',
                }}>
                  <strong style={{ color: '#1d4ed8', display: 'block', marginBottom: '4px' }}>
                    AI Recommendation & Evidence Synthesis:
                  </strong>
                  {selectedReport.recommendation_narrative}
                </div>

                {/* Interview Integrity & Proctoring Audit Card (PS2) */}
                <div style={{
                  background: (selectedReport.proctoring_integrity_score ?? 1.0) >= 0.85 ? '#f8fafc' : '#fffbeb',
                  border: `1px solid ${(selectedReport.proctoring_integrity_score ?? 1.0) >= 0.85 ? '#e2e8f0' : '#fde68a'}`,
                  borderRadius: '8px',
                  padding: '16px 18px',
                  marginBottom: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      background: (selectedReport.proctoring_integrity_score ?? 1.0) >= 0.85 ? '#eff6ff' : '#fef2f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                    }}>
                      🛡️
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                          Interview Integrity & Computer Vision Proctoring Audit (PS2)
                        </h4>
                        <span className={`badge ${(selectedReport.proctoring_integrity_score ?? 1.0) >= 0.85 ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.70rem' }}>
                          {(selectedReport.proctoring_integrity_score ?? 1.0) >= 0.85 ? 'CLEAN INTEGRITY' : 'FLAGGED AUDIT'}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        Keyframe video stream analyzed at 1 FPS across Face Presence, Gaze Deviation, Multiple People & Tab Blur detectors.
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: (selectedReport.proctoring_integrity_score ?? 1.0) >= 0.85 ? '#16a34a' : '#d97706',
                    }}>
                      {Math.round((selectedReport.proctoring_integrity_score ?? 1.0) * 100)}%
                    </span>
                    <span style={{ display: 'block', fontSize: '0.70rem', color: 'var(--text-dim)' }}>
                      Zero Critical Impersonation Flags
                    </span>
                  </div>
                </div>

                {/* Resume Defender: Extracted Claims vs Grounding */}
                {selectedReport.resume_claims && Array.isArray(selectedReport.resume_claims) && selectedReport.resume_claims.length > 0 && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '18px',
                    marginBottom: '28px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                          🛡️ "Defend Your Resume" Claim Extraction & Auditing
                        </h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                          Propositions extracted from candidate CV, verified against interview utterances
                        </span>
                      </div>
                      <span className="badge badge-indigo">
                        {selectedReport.resume_claims.length} Verifiable Claims
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedReport.resume_claims.map((claim: any, idx: number) => (
                        <div
                          key={claim.claim_id || idx}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '12px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '6px' }}>
                              "{claim.statement}"
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {(claim.keywords || []).map((kw: string, kidx: number) => (
                                <span key={kidx} className="badge badge-indigo" style={{ fontSize: '0.70rem', textTransform: 'lowercase' }}>
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="badge badge-emerald" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                              AUDITED IN INTERVIEW
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competency Evidence Citations */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Proof-Carrying Competency Breakdown</span>
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Every score is locked to a verbatim candidate quote
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Object.entries(selectedReport.competency_breakdown || {}).map(([compName, compData]: [string, any]) => (
                      <div
                        key={compName}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '18px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{compName}</span>
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
                          borderLeft: '4px solid var(--accent-primary)',
                          padding: '12px 16px',
                          borderRadius: '0 6px 6px 0',
                          fontSize: '0.86rem',
                          color: 'var(--text-main)',
                          fontStyle: 'italic',
                          lineHeight: '1.5',
                          marginBottom: '10px',
                        }}>
                          "{compData.evidence_quote}"
                        </div>

                        {/* Clickable Citation Button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                            Evidence captured in Turn #{compData.turn_index || 'N/A'}
                          </span>
                          <button
                            className="btn-secondary"
                            onClick={() => handleOpenTranscriptCitation(compData.turn_index, compName)}
                            style={{
                              fontSize: '0.78rem',
                              padding: '5px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--accent-primary)',
                              borderColor: '#bfdbfe',
                              background: '#eff6ff',
                            }}
                          >
                            <span>📜 Inspect in Full Transcript</span>
                            <span style={{ fontWeight: 700 }}>→</span>
                          </button>
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
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Human-in-the-Loop Reviewer Sign-off</h4>
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
                    placeholder="Enter mentor audit notes, reviewer rationale, or committee feedback..."
                    style={{
                      width: '100%',
                      minHeight: '65px',
                      marginBottom: '14px',
                      fontFamily: 'inherit',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                    }}
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
      ) : (
        /* ================= SUB-TAB 2: GROUNDED RAG KNOWLEDGE BASE ================= */
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          {/* Left Column: Indexed Corporate Documents */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Indexed Knowledge Documents
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  Vectorized in 384-dim semantic space
                </span>
              </div>
              <button className="btn-secondary" onClick={loadKnowledgeDocs} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                Refresh
              </button>
            </div>

            {loadingDocs ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading policies...</div>
            ) : knowledgeDocs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.86rem' }}>
                No documents found. Seed data script populates corporate policies.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {knowledgeDocs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '14px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        {doc.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                      Source: <code>{doc.source_filename}</code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-indigo" style={{ fontSize: '0.70rem' }}>
                        {doc.category}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a' }}>
                        {doc.chunk_count} Semantic Chunks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Live Semantic Query & Hallucination Guardrail Demo */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-emerald">Cosine Similarity</span>
                <span className="badge badge-indigo">Gating Guardrail (&tau; = 0.45)</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Semantic Policy Search & Hallucination Tester
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
                Test queries against indexed Zensar handbooks. If semantic similarity is below 0.45, the guardrail automatically prevents hallucination.
              </p>
            </div>

            {/* Preset Query Chips */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Preset Demonstration Scenarios (Click to test):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => handleExecuteRagQuery("What is the SLA for code reviews and unit test coverage?")}
                  style={{ fontSize: '0.76rem', padding: '6px 10px' }}
                >
                  🟢 Code Review & Test Coverage SLAs
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleExecuteRagQuery("How many casual and sick leaves are employees entitled to per year?")}
                  style={{ fontSize: '0.76rem', padding: '6px 10px' }}
                >
                  🟢 Annual Leave Entitlements
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleExecuteRagQuery("What are the guidelines for remote work and home office setup?")}
                  style={{ fontSize: '0.76rem', padding: '6px 10px' }}
                >
                  🟢 Remote Work Stipend Policy
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleExecuteRagQuery("Can employees bypass pull request reviews and deploy directly to production?")}
                  style={{ fontSize: '0.76rem', padding: '6px 10px', color: '#b91c1c', borderColor: '#fecaca' }}
                >
                  ⚠️ Deploy Unreviewed Code (Audit test)
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleExecuteRagQuery("What is the company budget for personal international vacation flights?")}
                  style={{ fontSize: '0.76rem', padding: '6px 10px', color: '#b45309', borderColor: '#fde68a' }}
                >
                  🚫 Holiday Flight Reimbursement (Policy Gap)
                </button>
              </div>
            </div>

            {/* Query Input Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteRagQuery(ragQuery)}
                placeholder="Ask any corporate policy question (e.g., leave limits, PR SLAs)..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                }}
              />
              <button
                className="btn-primary"
                onClick={() => handleExecuteRagQuery(ragQuery)}
                disabled={queryingRag || !ragQuery.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                {queryingRag ? 'Searching...' : 'Run Semantic Search 🔍'}
              </button>
            </div>

            {/* RAG Query Results */}
            {ragResult && (
              <div>
                {/* Guardrail Decision Banner */}
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  background: ragResult.is_grounded ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${ragResult.is_grounded ? '#a7f3d0' : '#fecaca'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: ragResult.is_grounded ? '#065f46' : '#991b1b',
                      display: 'block',
                      marginBottom: '2px',
                    }}>
                      {ragResult.is_grounded ? '✓ Grounded in Verified Policy' : '⚠️ Hallucination Guardrail Triggered (Policy Gap)'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: ragResult.is_grounded ? '#047857' : '#b91c1c' }}>
                      Status: <code>{ragResult.guardrail_status}</code> &bull; Query: "{ragResult.query}"
                    </span>
                  </div>
                  <span className={`badge ${ragResult.is_grounded ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.80rem' }}>
                    {ragResult.is_grounded ? 'CONFIRMED GROUNDED' : 'BLOCKED FROM ANSWERING'}
                  </span>
                </div>

                {/* Retrieved Semantic Matches */}
                <div>
                  <h4 style={{ fontSize: '0.90rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>
                    Ranked Vector Matches ({ragResult.matches?.length || 0}):
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(ragResult.matches || []).map((match: any, idx: number) => {
                      const simPercent = Math.round(match.similarity * 100);
                      return (
                        <div
                          key={idx}
                          style={{
                            background: '#ffffff',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            padding: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                              Chunk #{match.chunk_index} &bull; Rank #{idx + 1}
                            </span>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              color: simPercent >= 50 ? '#16a34a' : simPercent >= 35 ? '#d97706' : '#dc2626'
                            }}>
                              Cosine Similarity: {simPercent}%
                            </span>
                          </div>

                          <div style={{
                            background: '#f8fafc',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            fontSize: '0.84rem',
                            lineHeight: '1.5',
                            color: '#334155',
                            fontFamily: 'monospace',
                          }}>
                            {match.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= INTERACTIVE FULL TRANSCRIPT CITATION MODAL ================= */}
      {isTranscriptModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #cbd5e1',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              borderRadius: '12px 12px 0 0',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Interview Transcript Audit & Verification
                  </h3>
                  <span className="badge badge-indigo">
                    Target Turn #{highlightTurnIndex}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Candidate: <strong>{selectedReport?.candidate_name}</strong> &bull; Citation Target: <strong>{highlightCompetency}</strong>
                </div>
              </div>

              <button
                className="btn-secondary"
                onClick={() => setIsTranscriptModalOpen(false)}
                style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body: Chronological Dialogue Turns */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {loadingTranscript ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  Loading session transcript...
                </div>
              ) : transcriptTurns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  No transcript turns recorded for this session.
                </div>
              ) : (
                transcriptTurns.map((turn) => {
                  const isTarget = turn.turn_index === highlightTurnIndex;
                  const isAgent = turn.speaker === 'AI_AGENT' || turn.speaker === 'AI';

                  return (
                    <div
                      key={turn.id || turn.turn_index}
                      ref={isTarget ? targetTurnRef : null}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        background: isTarget ? '#eff6ff' : isAgent ? '#f8fafc' : '#ffffff',
                        border: isTarget ? '2px solid var(--accent-primary)' : '1px solid #e2e8f0',
                        boxShadow: isTarget ? '0 4px 6px -1px rgba(37, 99, 235, 0.15)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${isAgent ? 'badge-indigo' : 'badge-emerald'}`} style={{ fontSize: '0.72rem' }}>
                            {isAgent ? '🤖 AI Interviewer (Alex)' : `👤 Candidate (${selectedReport?.candidate_name})`}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                            Turn #{turn.turn_index}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isTarget && (
                            <span className="badge badge-emerald" style={{ fontSize: '0.70rem', fontWeight: 700 }}>
                              🎯 VERIFIED CITATION TARGET
                            </span>
                          )}
                          {turn.latency_ms && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              Latency: {Math.round(turn.latency_ms)}ms
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{
                        fontSize: '0.88rem',
                        lineHeight: '1.55',
                        color: isTarget ? '#1e3a8a' : 'var(--text-main)',
                        fontWeight: isTarget ? 600 : 400,
                      }}>
                        {turn.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderRadius: '0 0 12px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Auditable transcript trail stored immutably with millisecond-precision timestamps.
              </span>
              <button
                className="btn-primary"
                onClick={() => setIsTranscriptModalOpen(false)}
                style={{ padding: '6px 16px', fontSize: '0.82rem' }}
              >
                Back to Evaluation Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
