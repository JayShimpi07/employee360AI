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
    } catch (err: any) {
      console.error('Failed to load workflows', err);
    }
  };

  const selectWorkflow = async (wf: WorkflowDefinition) => {
    setSelectedWorkflow(wf);
    setCompileResult(null);
    try {
      const vers = await api.getWorkflowVersions(wf.id);
      setVersions(vers);
      if (vers.length > 0) {
        setSelectedVersion(vers[0]);
        setConfigEditorText(JSON.stringify(vers[0].config_json, null, 2));
      } else {
        setSelectedVersion(null);
        setConfigEditorText('{}');
      }
    } catch (err) {
      console.error('Failed to load workflow versions', err);
    }
  };

  const handleSelectVersion = (v: WorkflowVersion) => {
    setSelectedVersion(v);
    setConfigEditorText(JSON.stringify(v.config_json, null, 2));
    setCompileResult(null);
  };

  const handleCompile = async () => {
    if (!selectedWorkflow) return;
    try {
      setCompiling(true);
      setCompileResult(null);
      const parsedConfig = JSON.parse(configEditorText);
      const res = await api.compileWorkflow(selectedWorkflow.id, parsedConfig);
      setCompileResult({
        success: true,
        message: `Version ${res.version_number} compiled successfully!`,
        hash: res.compiled_hash
      });
      // Refresh versions
      const vers = await api.getWorkflowVersions(selectedWorkflow.id);
      setVersions(vers);
      if (vers.length > 0) setSelectedVersion(vers[0]);
    } catch (err: any) {
      setCompileResult({
        success: false,
        message: err.message || 'Compilation failed.'
      });
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>Agent Configuration Studio & Compiler</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Declarative workflow orchestration engine. Define persona, stages, competency rubrics, and action policies.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Sidebar: Workflow Selector */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Workflows
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => selectWorkflow(wf)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: selectedWorkflow?.id === wf.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${selectedWorkflow?.id === wf.id ? 'var(--accent-primary)' : 'transparent'}`,
                  transition: 'all 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{wf.name}</span>
                  <span className={`badge ${wf.category === 'HIRING' ? 'badge-indigo' : wf.category === 'ONBOARDING' ? 'badge-emerald' : 'badge-amber'}`}>
                    {wf.category}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: '1.3' }}>
                  {wf.description}
                </p>
              </div>
            ))}
          </div>

          {/* Versions List */}
          {selectedWorkflow && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Compiled Versions ({versions.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {versions.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleSelectVersion(v)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      background: selectedVersion?.id === v.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: `1px solid ${selectedVersion?.id === v.id ? 'var(--border-highlight)' : 'transparent'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span><strong>v{v.version_number}</strong> {v.is_active ? ' (Active)' : ''}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                      {v.compiled_hash.slice(0, 8)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Editor: Configuration Schema */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {selectedWorkflow?.name} {selectedVersion ? `(v${selectedVersion.version_number})` : ''}
              </h2>
              {selectedVersion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>SHA-256 Hash:</span>
                  <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px', color: '#67e8f9' }}>
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
              background: compileResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${compileResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
              color: compileResult.success ? '#6ee7b7' : '#fda4af',
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
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
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
                background: '#070b13',
                color: '#e2e8f0',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
