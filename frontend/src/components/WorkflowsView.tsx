import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { WorkflowDefinition } from '../types';

interface WorkflowsViewProps {
  onNavigateToAgent?: () => void;
  onNavigateToCandidates?: () => void;
  onConfigureAgent?: () => void;
}

export const WorkflowsView: React.FC<WorkflowsViewProps> = ({
  onNavigateToAgent,
  onConfigureAgent,
}) => {
  const [liveWorkflows, setLiveWorkflows] = useState<WorkflowDefinition[]>([]);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const data = await api.getWorkflows();
      setLiveWorkflows(data);
    } catch (err) {
      console.error('Failed to load workflows', err);
    }
  };

  const handleOpenStudio = () => {
    if (onNavigateToAgent) {
      onNavigateToAgent();
    } else if (onConfigureAgent) {
      onConfigureAgent();
    }
  };

  const workflowCards = [
    {
      category: 'HIRING',
      badge: 'badge-indigo',
      title: 'Hiring & Technical Assessment Workflow',
      purpose: 'Autonomous multi-stage technical interviews, dynamic rubric follow-up probes, and resume claim defense.',
      agentLoop: 'Understand Question → Probe Technical Depth → Challenge CV Claims → Grade Rubrics',
      status: 'Active (v1 Compiled)',
      hash: '67d3cdef8602b05d0fc49dfa2fa07308c05c0656eab4c3a55a6f14d2e55336a',
      stagesCount: 5,
      triggers: 'Candidate Invitation Token Click / Recruiter Schedule',
      guardrails: '1 FPS Proctoring, Tab-Blur Detection, Anti-Impersonation',
    },
    {
      category: 'ONBOARDING',
      badge: 'badge-emerald',
      title: 'New Hire Employee Onboarding Workflow',
      purpose: 'Provisioning engineering workstations, tax/withholding declaration sign-off, and compliance orientation.',
      agentLoop: 'Collect Declarations → Verify Hardware Tier → Provision IT Access → Issue Digital Sign-offs',
      status: 'Active (v1 Compiled)',
      hash: '9a4c10ef44d187e1a0b36f7808c16056eac4c3a55a6f14d2e55340a91176b5d',
      stagesCount: 3,
      triggers: 'Offer Accepted / Day 1 Employee Transition',
      guardrails: 'SOC-2 Sign-off Required, Two-Phase Verified IT Provisioning',
    },
    {
      category: 'ASSISTANCE',
      badge: 'badge-amber',
      title: 'Harper AI Employee Assistance & Case Resolution',
      purpose: 'Instant policy inquiries, autonomous statutory leave bookings, and IT hardware upgrades.',
      agentLoop: 'Intent Extraction → Grounded RAG Retrieval → Policy Preflight Check → Two-Phase Action Execution → Audit Receipt',
      status: 'Active (v1 Compiled)',
      hash: '4f88e1bc9178ad01e9c27f6718d09012eac4c3a55a6f14d2e55355c78201a4f',
      stagesCount: 4,
      triggers: 'Chat Message in Employee Portal / HR Service Ticket',
      guardrails: 'Grounded RAG Guardrail (Cosine > 0.35), Action Hash Persisted',
    },
  ];

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-indigo">Unified Lifecycle Architecture</span>
            <span className="badge badge-emerald">Shared AI Agent Core ({liveWorkflows.length > 0 ? liveWorkflows.length : 3} Workflows)</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Autonomous Workflows
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '4px' }}>
            The 3 core employee lifecycle workflows powered by the shared configurable AI Agent: Hiring, Onboarding, and Assistance.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleOpenStudio}
          style={{ padding: '8px 18px', fontWeight: 600 }}
        >
          ⚙️ Configure in AI Agent
        </button>
      </div>

      {/* Shared Agent Architecture Principle Card */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '18px 22px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            background: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          🔄
        </div>
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
            The Shared Agent Loop
          </div>
          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '3px', lineHeight: 1.45 }}>
            Every workflow executes through the same deterministic 7-step loop:
            <strong style={{ color: '#0f172a' }}> Understand &rarr; Plan &rarr; Gather Evidence &rarr; Check Policy &rarr; Act &rarr; Verify &rarr; Audit</strong>.
            Actions are verified before reporting success, and all events are cryptographically hashed.
          </div>
        </div>
      </div>

      {/* Workflow Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {workflowCards.map((wf) => (
          <div
            key={wf.category}
            className="glass-panel"
            style={{
              padding: '24px',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`badge ${wf.badge}`}>{wf.category}</span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {wf.title}
                </h2>
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: '#16a34a',
                  fontWeight: 700,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '3px 10px',
                  borderRadius: '12px',
                }}
              >
                ✓ {wf.status}
              </span>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '16px', lineHeight: 1.45 }}>
              {wf.purpose}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '14px',
                background: '#f8fafc',
                padding: '14px 18px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '14px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Execution Trigger
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {wf.triggers}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Sequential Stages
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {wf.stagesCount} Configured Stages
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Active Guardrails
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {wf.guardrails}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Immutable SHA-256
                </div>
                <code style={{ fontSize: '0.74rem', background: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', marginTop: '2px', display: 'inline-block' }}>
                  {wf.hash.slice(0, 10)}...{wf.hash.slice(-8)}
                </code>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.80rem', color: '#64748b' }}>
                <strong>Agent Execution Pattern:</strong> {wf.agentLoop}
              </div>
              <button
                className="btn-secondary"
                onClick={handleOpenStudio}
                style={{ padding: '5px 12px', fontSize: '0.78rem' }}
              >
                Inspect Schema &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
