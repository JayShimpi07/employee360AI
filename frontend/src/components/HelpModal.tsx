import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '920px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <span className="badge badge-indigo">Platform Guide & Architecture</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
              Employee360 AI &bull; Autonomous Architecture & User Flow Guide
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.90rem', marginTop: '2px' }}>
              Unified role-based platform powered by one shared deterministic 7-step autonomous agent loop.
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            ✕ Close
          </button>
        </div>

        {/* 7-Step Autonomous Loop Highlight */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🔄</span>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>
              The Shared 7-Step Autonomous Agent Core
            </h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#1e3a8a', margin: '0 0 10px 0', lineHeight: 1.45 }}>
            Every workflow (Candidate Interviewing, Employee Onboarding, and Harper HR Assistance) executes through the identical deterministic state loop:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
            {[
              { step: '1. Understand', desc: 'Intent & Entity parsing' },
              { step: '2. Plan', desc: 'DAG Workflow routing' },
              { step: '3. Evidence', desc: 'Semantic RAG retrieval' },
              { step: '4. Policy Check', desc: 'Zensar Guardrails check' },
              { step: '5. Act', desc: 'Tool execution & TTS' },
              { step: '6. Verify', desc: 'Output & fact scoring' },
              { step: '7. Audit Trail', desc: 'SHA-256 event ledger' },
            ].map((s, idx) => (
              <div key={idx} style={{ background: '#ffffff', borderRadius: '6px', padding: '8px', border: '1px solid #dbeafe', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8' }}>{s.step}</div>
                <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Primary Destinations Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Platform Destinations & Role Access
          </h3>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>📊</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>Overview</span>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>HR Admin &bull; HR Reviewer</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
              Executive health dashboard with active requisitions, interview volume, candidate pass rates, automated activity streams, and system status indicators.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>🔄</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>Workflows</span>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>HR Admin</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
              Visualizes the three core business lifecycles: <strong>1. Hiring &amp; Assessment</strong>, <strong>2. Employee Onboarding</strong>, and <strong>3. HR Assistance &amp; Case Resolution</strong>. Monitor autonomous triggers, state transitions, and compliance gates.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>👥</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>People</span>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>HR Admin &bull; HR Reviewer</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
              Manage Active Requisitions &amp; Competency Rubrics, Candidates in pipeline (with direct interview launcher and per-case delete buttons), and active Employees directory.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>🤖</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>AI Agent</span>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>HR Admin</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
              Configure interviewer persona, sequential stage prompt pipelines, SHA-256 workflow compiler, grounded Knowledge RAG document chunks, and autonomous tool declarations.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>⚖️</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>Evidence &amp; Reports</span>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>HR Admin &bull; HR Reviewer</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
              Proof-carrying candidate reports with verbatim transcript quotes, rubric claim verifications, individual case deletion, and human reviewer sign-off authority.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>Testing &amp; Monitoring</span>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>HR Admin</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
              Adversarial Proctoring Lab for webcam and synthetic anti-cheating benchmarks (absence, multi-face, glances, blur) and Research Fairness Lab for demographic equity audits.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>⚙️</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>Administration</span>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>HR Admin</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
              Platform user accounts, role definitions, company policy guardrails, absence thresholds, system diagnostics, and maintenance controls.
            </p>
          </div>

          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>👤</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#065f46' }}>Employee &amp; Candidate Dedicated Portals</span>
              </div>
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>Isolated Contexts</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#047857', margin: 0, lineHeight: 1.45 }}>
              <strong>Employee Portal:</strong> When signed in as an Employee, all recruitment and evaluation views are locked out; only personalized onboarding tasks, leave balances, and Harper AI chat are accessible.<br />
              <strong>Candidate Interview:</strong> Invitee links operate in a standalone zero-navigation shell with secure one-time HMAC cryptographic tokens and camera integrity monitoring.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-primary"
            onClick={onClose}
            style={{ padding: '8px 22px' }}
          >
            Got It, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
