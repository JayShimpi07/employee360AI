import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { WorkflowStudio } from './WorkflowStudio';

export const AIAgentView: React.FC = () => {
  const [subTab, setSubTab] = useState<'config' | 'knowledge' | 'tools'>('config');
  const [documents, setDocuments] = useState<any[]>([]);
  const [queryText, setQueryText] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = async () => {
    try {
      const docs = await api.getKnowledgeDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load knowledge documents', err);
    }
  };

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    try {
      setQuerying(true);
      const res = await api.queryKnowledge(queryText.trim());
      setQueryResult(res);
    } catch (err: any) {
      alert(err.message || 'Query failed');
    } finally {
      setQuerying(false);
    }
  };

  const toolsList = [
    {
      name: 'verify_and_deduct_leave',
      category: 'EMPLOYEE_BENEFITS',
      description: 'Executes statutory leave balance verification, checks blackout periods, and deducts PTO with two-phase rollback protection.',
      verified: true,
      phase: 'Phase 5 Autonomous Execution',
      receiptAlgorithm: 'SHA-256 HMAC Action Receipt',
    },
    {
      name: 'provision_developer_workstation',
      category: 'IT_HARDWARE',
      description: 'Allocates standard engineering workstations (Apple MacBook Pro M3 Max or ThinkPad P16), registers serial in asset ledger.',
      verified: true,
      phase: 'Phase 5 Autonomous Execution',
      receiptAlgorithm: 'SHA-256 HMAC Action Receipt',
    },
    {
      name: 'extract_resume_claims',
      category: 'HIRING_INTELLIGENCE',
      description: 'Extracts verifiable technical claims from candidate CVs using NLP and generates dynamic cross-examination questions for AI Alex.',
      verified: true,
      phase: 'Phase 3 Resume Defense',
      receiptAlgorithm: 'Propositional Graph Parser',
    },
    {
      name: 'frame_anomaly_detector',
      category: 'PROCTORING_VISION',
      description: 'Samples candidate video at 1 FPS, computes face presence, gaze offset, and tab blur alerts.',
      verified: true,
      phase: 'Phase 4 Vision Integrity',
      receiptAlgorithm: 'Haar Cascade & MobileNet Pipeline',
    },
  ];

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-indigo">Unified Intelligence Hub</span>
          <span className="badge badge-emerald">Shared AI Agent Core</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          AI Agent Management
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '4px' }}>
          Configure the shared AI agent personality, grounded RAG knowledge sources, autonomous tools, and tamper-proof workflow definitions.
        </p>
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
          onClick={() => setSubTab('config')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: subTab === 'config' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'config' ? '#2563eb' : '#64748b',
            fontWeight: subTab === 'config' ? 700 : 500,
            fontSize: '0.90rem',
            cursor: 'pointer',
          }}
        >
          Agent Configuration (Studio)
        </button>
        <button
          onClick={() => setSubTab('knowledge')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: subTab === 'knowledge' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'knowledge' ? '#2563eb' : '#64748b',
            fontWeight: subTab === 'knowledge' ? 700 : 500,
            fontSize: '0.90rem',
            cursor: 'pointer',
          }}
        >
          Knowledge Sources & RAG ({documents.length} Documents)
        </button>
        <button
          onClick={() => setSubTab('tools')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: subTab === 'tools' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'tools' ? '#2563eb' : '#64748b',
            fontWeight: subTab === 'tools' ? 700 : 500,
            fontSize: '0.90rem',
            cursor: 'pointer',
          }}
        >
          Autonomous Tools & Actions ({toolsList.length})
        </button>
      </div>

      {/* SUB-TAB 1: AGENT CONFIGURATION (STUDIO) */}
      {subTab === 'config' && (
        <div style={{ marginTop: '-12px' }}>
          <WorkflowStudio />
        </div>
      )}

      {/* SUB-TAB 2: KNOWLEDGE SOURCES (RAG) */}
      {subTab === 'knowledge' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px' }}>
          {/* Left: Document List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
              Active Grounded Knowledge Sources
            </div>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📄</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {doc.title}
                    </h3>
                  </div>
                  <span className="badge badge-indigo">{doc.category}</span>
                </div>
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                  <span>✓ <strong>{doc.chunks_count || 3}</strong> Vector Chunks</span>
                  <span>&bull;</span>
                  <span>Version: <strong>v{doc.version || 1}</strong></span>
                  <span>&bull;</span>
                  <span>Grounded Guardrail: <strong>Cosine Similarity &gt; 0.35</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: RAG Semantic Query Tester */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              RAG Semantic Search Tester
            </h3>
            <p style={{ fontSize: '0.80rem', color: '#64748b', marginBottom: '16px' }}>
              Test how the shared agent retrieves factual evidence from enterprise policies.
            </p>

            <form onSubmit={handleTestQuery} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="e.g. How many days of annual leave do I get?"
                style={{ width: '100%', fontSize: '0.86rem', padding: '10px 12px' }}
              />
              <button className="btn-primary" type="submit" disabled={querying} style={{ justifyContent: 'center' }}>
                {querying ? 'Searching Vector Chunks...' : '🔍 Execute Grounded Search'}
              </button>
            </form>

            {queryResult && (
              <div style={{ marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Retrieved Snippets ({queryResult.chunks?.length || 0}):
                </div>
                {queryResult.chunks?.map((c: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '0.78rem',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>
                      {c.doc_title || 'Handbook'} (Similarity: {Math.round(c.similarity * 100)}%)
                    </div>
                    <div style={{ color: '#334155', fontStyle: 'italic' }}>
                      "{c.chunk_text}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AUTONOMOUS TOOLS */}
      {subTab === 'tools' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {toolsList.map((t) => (
            <div
              key={t.name}
              className="glass-panel"
              style={{
                padding: '24px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <code style={{ fontSize: '0.90rem', fontWeight: 800, color: '#2563eb' }}>
                  {t.name}()
                </code>
                <span className="badge badge-emerald">Verified Tool</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: '8px 0 14px 0', lineHeight: 1.45 }}>
                {t.description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <span>Phase: <strong>{t.phase}</strong></span>
                <span>Audit: <strong>{t.receiptAlgorithm}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
