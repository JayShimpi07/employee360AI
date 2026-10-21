import React, { useState } from 'react';
import { AdversarialProctoringLab } from './AdversarialProctoringLab';
import { ResearchFairnessLab } from './ResearchFairnessLab';

export const TestingMonitoringView: React.FC = () => {
  const [subTab, setSubTab] = useState<'proctoring' | 'fairness'>('proctoring');

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-amber">Quality Assurance & Trust</span>
          <span className="badge badge-indigo">Algorithmic Governance</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Testing & Monitoring Lab
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '4px' }}>
          Verify anti-cheating vision proctoring integrity and benchmark algorithmic counterfactual fairness across demographic cohorts.
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
          onClick={() => setSubTab('proctoring')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: subTab === 'proctoring' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'proctoring' ? '#2563eb' : '#64748b',
            fontWeight: subTab === 'proctoring' ? 700 : 500,
            fontSize: '0.90rem',
            cursor: 'pointer',
          }}
        >
          🛡️ Adversarial Proctoring Lab (PS2)
        </button>
        <button
          onClick={() => setSubTab('fairness')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: subTab === 'fairness' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'fairness' ? '#2563eb' : '#64748b',
            fontWeight: subTab === 'fairness' ? 700 : 500,
            fontSize: '0.90rem',
            cursor: 'pointer',
          }}
        >
          🔬 Research & Counterfactual Fairness Lab
        </button>
      </div>

      {/* Content Rendering */}
      {subTab === 'proctoring' ? (
        <div style={{ marginTop: '-20px' }}>
          <AdversarialProctoringLab />
        </div>
      ) : (
        <div style={{ marginTop: '-20px' }}>
          <ResearchFairnessLab />
        </div>
      )}
    </div>
  );
};
