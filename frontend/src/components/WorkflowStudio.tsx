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

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span className="badge badge-indigo" style={{ marginBottom: '8px' }}>Declarative Engine</span>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>Agent Configuration Studio</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Define multi-stage agent workflows, state transitions, and proctoring policies with deterministic cryptographic verification.
        </p>
      </div>

      {/* Main Studio Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
        {/* Left Sidebar: Workflow Definitions & Versions */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '14px' }}>
            Workflow Definitions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                Compiled Versions ({versions.length})
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

        {/* Right Editor: Configuration Schema */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {selectedWorkflow?.name} {selectedVersion ? `(v${selectedVersion.version_number})` : ''}
              </h2>
              {selectedVersion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>SHA-256 Hash:</span>
                  <code style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }}>
                    {selectedVersion.compiled_hash}
                  </code>
                </div>
              )}
            </div>
            <button
              className="btn-primary"
              onClick={handleCompile}
              disabled={compiling}
            >
              {compiling ? 'Validating...' : 'Validate & Compile Workflow'}
            </button>
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
              <strong>{compileResult.success ? 'Compilation Succeeded:' : 'Compilation Error:'}</strong> {compileResult.message}
              {compileResult.hash && (
                <div style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                  Deterministic Hash: <code>{compileResult.hash}</code>
                </div>
              )}
            </div>
          )}

          {/* JSON Textarea Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Declarative Schema JSON (Pydantic Schema Contract):
            </label>
            <textarea
              value={configEditorText}
              onChange={(e) => setConfigEditorText(e.target.value)}
              style={{
                flex: 1,
                minHeight: '480px',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '0.88rem',
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
        </div>
      </div>
    </div>
  );
};
