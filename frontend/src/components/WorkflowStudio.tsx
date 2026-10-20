import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { WorkflowDefinition, WorkflowVersion } from '../types';

export const WorkflowStudio: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<WorkflowVersion | null>(null);
  const [configEditorText, setConfigEditorText] = useState<string>('');
  const [compiling, setCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState<{ success: boolean; message: string; hash?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const data = await api.getWorkflows();
      setWorkflows(data);
      if (data.length > 0) {
        selectWorkflow(data[0]);
      }
    } catch (err) {
      console.error('Failed to load workflows', err);
    }
  };

  const selectWorkflow = async (wf: WorkflowDefinition) => {
    setSelectedWorkflow(wf);
    setCompileResult(null);
    try {
      const vList = await api.getWorkflowVersions(wf.id);
      setVersions(vList);
      if (vList.length > 0) {
        handleSelectVersion(vList[0]);
      } else {
        setSelectedVersion(null);
        setConfigEditorText('{}');
      }
    } catch (err) {
      console.error('Failed to load versions', err);
    }
  };

  const handleSelectVersion = (v: WorkflowVersion) => {
    setSelectedVersion(v);
    setConfigEditorText(JSON.stringify(v.config_json, null, 2));
    setCompileResult(null);
  };

  const handleCompile = async () => {
    try {
      setCompiling(true);
      if (!selectedWorkflow) return;
      const parsed = JSON.parse(configEditorText);
      const res = await api.compileWorkflow(selectedWorkflow.id, parsed);
      setCompileResult({
        success: true,
        message: 'Workflow compiled and validated successfully with deterministic SHA-256 hash.',
        hash: res.compiled_hash,
      });
      if (selectedWorkflow) {
        const vList = await api.getWorkflowVersions(selectedWorkflow.id);
        setVersions(vList);
      }
    } catch (err: any) {
      setCompileResult({
        success: false,
        message: err.message || 'Workflow schema validation failed.',
      });
    } finally {
      setCompiling(false);
    }
  };

  // Safely parse config for visual display
  let parsedConfig: any = null;
  try {
    parsedConfig = configEditorText ? JSON.parse(configEditorText) : null;
  } catch {
    parsedConfig = null;
  }

  const stages: any[] = parsedConfig?.stages || [];
  const persona = parsedConfig?.persona || {};
  const proctoring = parsedConfig?.proctoring_policy || {};

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-indigo">Workflow Orchestration</span>
          <span className="badge badge-emerald">Zensar HR Capstone</span>
        </div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
          AI Interview Workflow Studio
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Configure AI interviewer personas, multi-stage question pipelines, and proctoring guardrails with tamper-proof cryptographic versioning.
        </p>

        {/* Informative Feature Explanation Card */}
        <div style={{
          marginTop: '16px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '0.85rem',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '1.25rem' }}>💡</span>
          <div>
            <strong>What is this feature?</strong> This studio lets HR managers customize how the AI conducts interviews — setting the AI's tone, the sequence of technical questions, resume defense checks, and anti-cheating policies without writing code. Every approved version is locked with a SHA-256 cryptographic hash so candidates are evaluated fairly against identical standards.
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Sidebar: Workflow Definitions & Versions */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '14px' }}>
            Available Workflows
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {workflows.map((wf) => {
              const isSelected = selectedWorkflow?.id === wf.id;
              return (
                <div
                  key={wf.id}
                  onClick={() => selectWorkflow(wf)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.90rem', color: 'var(--text-main)' }}>{wf.name}</span>
                    <span className={`badge ${wf.category === 'HIRING' ? 'badge-indigo' : wf.category === 'ONBOARDING' ? 'badge-emerald' : 'badge-amber'}`}>
                      {wf.category}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: '1.3' }}>
                    {wf.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Versions List */}
          {selectedWorkflow && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.80rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '10px' }}>
                Immutable Versions ({versions.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {versions.map((v) => {
                  const isVerSelected = selectedVersion?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSelectVersion(v)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        background: isVerSelected ? '#eff6ff' : 'transparent',
                        border: `1px solid ${isVerSelected ? '#bfdbfe' : 'transparent'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: isVerSelected ? 'var(--accent-primary)' : 'var(--text-main)',
                      }}
                    >
                      <span><strong>v{v.version_number}</strong> {v.is_active ? ' (Active)' : ''}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        {v.compiled_hash.slice(0, 8)}...
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Visual Workflow Builder or Raw JSON */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          {/* Top Bar: Title, Hash, and View Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                {selectedWorkflow?.name} {selectedVersion ? `(v${selectedVersion.version_number})` : ''}
              </h2>
              {selectedVersion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Cryptographic SHA-256:</span>
                  <code style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px' }}>
                    {selectedVersion.compiled_hash}
                  </code>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('visual')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: viewMode === 'visual' ? '#ffffff' : 'transparent',
                    color: viewMode === 'visual' ? '#2563eb' : '#64748b',
                    boxShadow: viewMode === 'visual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  👁️ Visual Pipeline
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('code')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: viewMode === 'code' ? '#ffffff' : 'transparent',
                    color: viewMode === 'code' ? '#2563eb' : '#64748b',
                    boxShadow: viewMode === 'code' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  &lt;/&gt; Raw JSON Contract
                </button>
              </div>

              <button
                className="btn-primary"
                onClick={handleCompile}
                disabled={compiling}
              >
                {compiling ? 'Compiling...' : '⚡ Validate & Compile'}
              </button>
            </div>
          </div>

          {/* Compilation Feedback Alert */}
          {compileResult && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              background: compileResult.success ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${compileResult.success ? '#bbf7d0' : '#fecaca'}`,
              color: compileResult.success ? '#15803d' : '#b91c1c',
              fontSize: '0.88rem'
            }}>
              <strong>{compileResult.success ? 'Workflow Compiled Successfully:' : 'Validation Error:'}</strong> {compileResult.message}
              {compileResult.hash && (
                <div style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                  Deterministic Hash: <code>{compileResult.hash}</code>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 1: VISUAL PIPELINE BUILDER */}
          {viewMode === 'visual' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* AI Persona Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                }}>
                  🤖
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Interviewer Persona: {persona.name || 'Alex'}
                    </h3>
                    <span className="badge badge-indigo">{persona.role || 'Lead Technical HR Interviewer'}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                    <strong>Tone:</strong> {persona.tone || 'Professional, objective, encouraging'}
                  </div>
                  <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                    "{persona.instruction || 'Evaluates candidate competencies and asks targeted follow-up probes if responses lack depth.'}"
                  </div>
                </div>
              </div>

              {/* Multi-Stage Pipeline Stepper */}
              <div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                  Sequential Interview Stages ({stages.length} Stages)
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stages.map((st, idx) => {
                    const iconMap: Record<string, string> = {
                      GREETING: '🎙️',
                      TECHNICAL_PROBE: '⚡',
                      RESUME_VERIFICATION: '🛡️',
                      BEHAVIORAL: '🤝',
                      CLOSING: '🏁',
                    };
                    const colorMap: Record<string, string> = {
                      GREETING: '#eff6ff',
                      TECHNICAL_PROBE: '#f0fdf4',
                      RESUME_VERIFICATION: '#fef3c7',
                      BEHAVIORAL: '#f5f3ff',
                      CLOSING: '#f8fafc',
                    };
                    const borderMap: Record<string, string> = {
                      GREETING: '#bfdbfe',
                      TECHNICAL_PROBE: '#bbf7d0',
                      RESUME_VERIFICATION: '#fde68a',
                      BEHAVIORAL: '#ddd6fe',
                      CLOSING: '#e2e8f0',
                    };

                    const icon = iconMap[st.type] || '📌';
                    const bg = colorMap[st.type] || '#ffffff';
                    const border = borderMap[st.type] || '#cbd5e1';

                    return (
                      <div
                        key={st.stage_id || idx}
                        style={{
                          background: bg,
                          border: `1px solid ${border}`,
                          borderRadius: '8px',
                          padding: '14px 18px',
                          display: 'flex',
                          gap: '14px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          fontWeight: 700,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                          flexShrink: 0,
                        }}>
                          {icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0f172a' }}>
                                Stage {idx + 1}: {st.stage_id?.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                                {st.type}
                              </span>
                            </div>
                            {st.competency_key && (
                              <span className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                                Rubric: {st.competency_key}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.84rem', color: '#334155', margin: 0, lineHeight: '1.4' }}>
                            {st.script || st.prompt || 'Autonomous probing dialogue stage.'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Proctoring & Guardrails Policy Card */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Active Proctoring Policies (PS2 Guardrails)
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Camera Sampling</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                      {proctoring.face_detection_fps || 1} FPS Keyframe
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Max Absence Limit</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                      {proctoring.max_allowed_absence_sec || 10} seconds
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Multiple Faces</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: proctoring.flag_multiple_faces !== false ? '#16a34a' : '#94a3b8' }}>
                      {proctoring.flag_multiple_faces !== false ? '✓ Flag Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Tab Blur & Focus</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: proctoring.flag_tab_blur !== false ? '#16a34a' : '#94a3b8' }}>
                      {proctoring.flag_tab_blur !== false ? '✓ Tab Blur Tracked' : 'Disabled'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW MODE 2: CODE / JSON CONTRACT */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Declarative Schema JSON (Pydantic Schema Contract):
              </label>
              <textarea
                value={configEditorText}
                onChange={(e) => setConfigEditorText(e.target.value)}
                style={{
                  flex: 1,
                  minHeight: '440px',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.86rem',
                  lineHeight: '1.45',
                  background: '#f8fafc',
                  color: '#0f172a',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  resize: 'vertical',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
