import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { OnboardingTaskItem, OnboardingTasksResponse, HRCaseItem, HarperChatResponse } from '../types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionExecuted?: boolean;
  actionName?: string;
  receiptHash?: string;
  verificationStatus?: string;
  details?: Record<string, any>;
  grounded?: boolean;
  citations?: Array<{ source: string; section?: string; snippet: string; similarity?: number }>;
  guardrailStatus?: string;
}

export const EmployeePortal: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'assistant' | 'onboarding' | 'cases'>('assistant');

  // Onboarding state
  const [onboardingData, setOnboardingData] = useState<OnboardingTasksResponse | null>(null);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  // Form states for onboarding interactive actions
  const [selectedTaxRegime, setSelectedTaxRegime] = useState<string>('NEW_REGIME');
  const [selectedLaptop, setSelectedLaptop] = useState<string>('Apple MacBook Pro 16 M3 Max');
  const [securityAcknowledged, setSecurityAcknowledged] = useState<boolean>(false);

  // Cases state
  const [cases, setCases] = useState<HRCaseItem[]>([]);
  const [loadingCases, setLoadingCases] = useState<boolean>(false);

  // Harper Chat state
  const [inputMessage, setInputMessage] = useState<string>('');
  const [sendingChat, setSendingChat] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello Alex! I am **Harper**, your Zensar Autonomous HR & Self-Service Assistant. I can look up grounded HR policies (PTO, hybrid work, benefits) and autonomously execute verified HR actions (leave requests, laptop requisitions, tax declarations) using our Controlled Two-Phase Action Registry.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      grounded: true,
      citations: [
        {
          source: "Zensar Enterprise Policy Knowledge Base",
          section: "Autonomous Lifecycle Registry",
          snippet: "Pre-execution policy verification followed by atomic state mutation and SHA-256 cryptographic audit receipts."
        }
      ]
    }
  ]);

  // Load onboarding tasks
  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      const data = await api.getOnboardingTasks();
      setOnboardingData(data);
    } catch (err) {
      console.error('Failed to load onboarding tasks', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Load cases
  const loadCases = async () => {
    try {
      setLoadingCases(true);
      const data = await api.getEmployeeCases();
      setCases(data);
    } catch (err) {
      console.error('Failed to load HR cases', err);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    loadTasks();
    loadCases();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'assistant') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSubTab]);

  // Handle Send Chat
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || sendingChat) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setSendingChat(true);

    try {
      const resp: HarperChatResponse = await api.chatWithHarper(textToSend);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: resp.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionExecuted: resp.action_executed,
        actionName: resp.action_name,
        receiptHash: resp.receipt_hash,
        verificationStatus: resp.verification_status,
        details: resp.details,
        grounded: resp.grounded,
        citations: resp.citations,
        guardrailStatus: resp.guardrail_status
      };
      setMessages(prev => [...prev, botMsg]);

      // If action executed, refresh tasks and cases in background
      if (resp.action_executed) {
        loadTasks();
        loadCases();
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ I encountered an error communicating with the Autonomous Engine: ${err.message || 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSendingChat(false);
    }
  };

  // Submit onboarding task
  const handleSubmitTask = async (task: OnboardingTaskItem) => {
    try {
      setSubmittingTaskId(task.id);
      let payload: Record<string, any> = {};
      const titleLower = task.title.toLowerCase();

      if (titleLower.includes('tax')) {
        payload = { regime: selectedTaxRegime };
      } else if (titleLower.includes('laptop')) {
        payload = { laptop_model: selectedLaptop, tier: 'ENGINEERING_STANDARD' };
      } else if (titleLower.includes('security')) {
        payload = { acknowledged: true };
      }

      await api.submitOnboardingTask(task.id, payload);
      await loadTasks();
      await loadCases();

      // Add feedback message in Harper chat
      const botMsg: ChatMessage = {
        id: `task-verified-${Date.now()}`,
        sender: 'assistant',
        text: `Your onboarding task **"${task.title}"** was submitted and verified autonomously via the Two-Phase Action Registry. Status updated to **VERIFIED**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionExecuted: true,
        actionName: titleLower.includes('tax') ? 'submit_tax_form' : titleLower.includes('laptop') ? 'it_hardware_ticket' : 'sign_security_policy'
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const copyReceipt = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px' }}>
      {/* Executive Header Banner */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>💼</span>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Employee Self-Service & Autonomous Workflows
            </h1>
            <span className="badge badge-indigo">Phase 5 Production</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
            Zensar Employee Lifecycle Portal powered by Harper (Autonomous HR Assistant), Grounded RAG Policies, and Controlled Two-Phase Action Registry.
          </p>
        </div>

        {/* Demo User Info Card */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'var(--accent-primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.95rem'
          }}>
            AS
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {onboardingData?.employee_name || 'Alex Smith'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Software Engineer &bull; alex.smith@zensar.com
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '12px', marginLeft: '4px' }}>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>Onboarding</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {onboardingData ? `${onboardingData.completion_percentage}%` : '0%'}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '24px',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveSubTab('assistant')}
          style={{
            background: activeSubTab === 'assistant' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'assistant' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeSubTab === 'assistant' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            padding: '10px 20px',
            fontWeight: activeSubTab === 'assistant' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none'
          }}
        >
          💬 AI HR Assistant (Harper)
        </button>

        <button
          onClick={() => { setActiveSubTab('onboarding'); loadTasks(); }}
          style={{
            background: activeSubTab === 'onboarding' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'onboarding' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeSubTab === 'onboarding' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            padding: '10px 20px',
            fontWeight: activeSubTab === 'onboarding' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none'
          }}
        >
          📋 New Hire Onboarding Checklist
          {onboardingData && (
            <span className={`badge ${onboardingData.verified_tasks === onboardingData.total_tasks ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.70rem', padding: '2px 6px' }}>
              {onboardingData.verified_tasks}/{onboardingData.total_tasks}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveSubTab('cases'); loadCases(); }}
          style={{
            background: activeSubTab === 'cases' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'cases' ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: activeSubTab === 'cases' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            padding: '10px 20px',
            fontWeight: activeSubTab === 'cases' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none'
          }}
        >
          🎫 Support Cases & Receipts
          {cases.length > 0 && (
            <span className="badge badge-indigo" style={{ fontSize: '0.70rem', padding: '2px 6px' }}>
              {cases.length}
            </span>
          )}
        </button>
      </div>

      {/* ================= SUB-TAB 1: AI HR ASSISTANT (HARPER) ================= */}
      {activeSubTab === 'assistant' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Main Chat Panel */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '680px', overflow: 'hidden' }}>
            {/* Chat Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}>
                  H
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Harper &bull; AI HR Assistant</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }}></span>
                    Active &bull; Grounded RAG + Controlled Registry
                  </div>
                </div>
              </div>
              <span className="badge badge-indigo">2-Phase Verification</span>
            </div>

            {/* Chat Messages Log */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              background: '#fafbfc',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    background: m.sender === 'user' ? 'var(--accent-primary)' : '#ffffff',
                    color: m.sender === 'user' ? '#ffffff' : 'var(--text-main)',
                    border: m.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
                    borderLeft: m.sender === 'assistant' ? '4px solid var(--accent-primary)' : 'none',
                    borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '14px 18px',
                    fontSize: '0.90rem',
                    lineHeight: '1.55',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {m.text}

                    {/* Action Execution Highlight Card */}
                    {m.actionExecuted && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px 14px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        color: '#166534',
                        fontSize: '0.82rem'
                      }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <span>✓</span> Action Autonomous Execution Verified
                          <span className="badge badge-emerald" style={{ fontSize: '0.68rem', marginLeft: 'auto' }}>
                            {m.verificationStatus || 'VERIFIED'}
                          </span>
                        </div>
                        {m.actionName && (
                          <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
                            Action Registry: <strong>{m.actionName}</strong>
                          </div>
                        )}
                        {m.receiptHash && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #bbf7d0' }}>
                            <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                              Cryptographic SHA-256 Receipt:
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#ffffff',
                              border: '1px solid #dcfce7',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              marginTop: '4px',
                              fontFamily: 'monospace',
                              fontSize: '0.72rem',
                              color: '#0f172a'
                            }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                                {m.receiptHash}
                              </span>
                              <button
                                onClick={() => copyReceipt(m.receiptHash!)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--accent-primary)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.72rem',
                                  marginLeft: '8px'
                                }}
                              >
                                {copiedHash === m.receiptHash ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Grounded Policy Citations */}
                    {m.citations && m.citations.length > 0 && (
                      <div style={{
                        marginTop: '12px',
                        padding: '10px 12px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        fontSize: '0.80rem',
                        color: '#1e40af'
                      }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span>📖</span> Grounded Policy Citation
                        </div>
                        {m.citations.map((c, i) => (
                          <div key={i} style={{ marginTop: '4px' }}>
                            <div style={{ fontWeight: 600, color: '#1d4ed8' }}>
                              {c.source} {c.section ? `— ${c.section}` : ''}
                            </div>
                            <div style={{ fontStyle: 'italic', color: '#3b82f6', marginTop: '2px', fontSize: '0.76rem' }}>
                              "{c.snippet}"
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hallucination Guardrail Warning */}
                    {m.guardrailStatus === 'POLICY_GAP_ESCALATION_REQUIRED' && (
                      <div style={{
                        marginTop: '12px',
                        padding: '10px 12px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '0.80rem',
                        color: '#991b1b'
                      }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🛡️</span> Hallucination Guardrail Active
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                          Query similarity was below verified policy threshold. Request has been routed to HR Operations instead of generating ungrounded advice.
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px', padding: '0 4px' }}>
                    {m.timestamp}
                  </span>
                </div>
              ))}
              {sendingChat && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.80rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse 1s infinite' }}></div>
                  Harper is consulting Grounded RAG & Action Registry...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: '#ffffff',
              display: 'flex',
              gap: '10px'
            }}>
              <input
                type="text"
                placeholder="Ask a policy question or request an action (e.g. 'Request 2 days casual leave', 'Order MacBook Pro')..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                disabled={sendingChat}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: '#ffffff',
                  color: 'var(--text-main)'
                }}
              />
              <button
                className="btn-primary"
                onClick={() => handleSendMessage()}
                disabled={sendingChat || !inputMessage.trim()}
                style={{ padding: '0 20px' }}
              >
                {sendingChat ? 'Processing...' : 'Send'}
              </button>
            </div>
          </div>

          {/* Quick Action Chips & Knowledge Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
                ⚡ Quick Action Prompts
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => handleSendMessage("Please request 3 days of casual leave for me")}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '0.80rem', padding: '8px 12px' }}
                >
                  🏖️ "Request 3 days casual leave"
                </button>
                <button
                  onClick={() => handleSendMessage("I need to requisition an Apple MacBook Pro M3 for my workstation")}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '0.80rem', padding: '8px 12px' }}
                >
                  💻 "Requisition MacBook Pro M3"
                </button>
                <button
                  onClick={() => handleSendMessage("Submit my tax regime declaration under the New Tax Regime")}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '0.80rem', padding: '8px 12px' }}
                >
                  📑 "Submit New Tax Regime Form"
                </button>
                <button
                  onClick={() => handleSendMessage("I acknowledge and sign the Information Security & SOC-2 policy")}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '0.80rem', padding: '8px 12px' }}
                >
                  🛡️ "Sign Security & SOC-2 Policy"
                </button>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
                📚 Grounded Policy Inquiries
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => handleSendMessage("What is our remote work policy and annual leave accrual?")}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '0.80rem', padding: '8px 12px' }}
                >
                  🌴 "What is our PTO & remote work policy?"
                </button>
                <button
                  onClick={() => handleSendMessage("What are the code review and unit test SLAs in the engineering handbook?")}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '0.80rem', padding: '8px 12px' }}
                >
                  ⚙️ "What are the engineering SLAs?"
                </button>
                <button
                  onClick={() => handleSendMessage("Can employees operate commercial drones from the office cafeteria?")}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '0.80rem', padding: '8px 12px' }}
                >
                  ⚠️ "Test Hallucination Guardrail"
                </button>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px 20px', background: '#f8fafc' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                System Architecture
              </div>
              <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.6', paddingLeft: '16px' }}>
                <li><strong>Phase 1:</strong> Pre-flight policy validation against Grounded RAG index.</li>
                <li><strong>Phase 2:</strong> Atomic database mutation and post-state verification.</li>
                <li><strong>Receipts:</strong> Deterministic SHA-256 cryptographic hashes for non-repudiation.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: ONBOARDING CHECKLIST ================= */}
      {activeSubTab === 'onboarding' && (
        <div>
          {/* Progress Banner */}
          <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  New Hire Onboarding Verification Checklist
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Mandatory Phase 5 compliance items. Each task is autonomously verified and issued a cryptographic audit receipt.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {onboardingData ? `${onboardingData.completion_percentage}%` : '0%'}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  {onboardingData?.verified_tasks} of {onboardingData?.total_tasks} Tasks Verified
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${onboardingData?.completion_percentage || 0}%`,
                background: 'linear-gradient(90deg, #2563eb, #10b981)',
                borderRadius: '999px',
                transition: 'width 0.4s ease-in-out'
              }} />
            </div>
          </div>

          {/* Tasks Cards Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loadingTasks ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Loading onboarding checklist...</div>
            ) : onboardingData?.tasks.map((task) => {
              const isVerified = task.status === 'VERIFIED';
              const isTax = task.title.toLowerCase().includes('tax');
              const isLaptop = task.title.toLowerCase().includes('laptop');
              const isSecurity = task.title.toLowerCase().includes('security');

              return (
                <div
                  key={task.id}
                  className="glass-panel"
                  style={{
                    padding: '20px 24px',
                    borderLeft: isVerified ? '4px solid var(--accent-emerald)' : '4px solid var(--accent-amber)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.3rem' }}>
                        {isTax ? '📑' : isLaptop ? '💻' : '🛡️'}
                      </span>
                      <div>
                        <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {task.title}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
                          {task.description}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${isVerified ? 'badge-emerald' : 'badge-amber'}`}>
                      {isVerified ? 'VERIFIED ✓' : 'PENDING'}
                    </span>
                  </div>

                  {/* Interactive Submission Form if PENDING */}
                  {!isVerified && (
                    <div style={{
                      marginTop: '8px',
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      {isTax && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>Select Regime:</label>
                          <select
                            value={selectedTaxRegime}
                            onChange={(e) => setSelectedTaxRegime(e.target.value)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-strong)',
                              fontSize: '0.82rem',
                              background: '#ffffff'
                            }}
                          >
                            <option value="NEW_REGIME">New Tax Regime (Section 115BAC — Default)</option>
                            <option value="OLD_REGIME">Old Tax Regime (With Section 80C Deductions)</option>
                          </select>
                        </div>
                      )}

                      {isLaptop && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>Workstation Tier:</label>
                          <select
                            value={selectedLaptop}
                            onChange={(e) => setSelectedLaptop(e.target.value)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-strong)',
                              fontSize: '0.82rem',
                              background: '#ffffff'
                            }}
                          >
                            <option value="Apple MacBook Pro 16 M3 Max">Apple MacBook Pro 16 M3 Max (36GB Unified RAM)</option>
                            <option value="Lenovo ThinkPad P16 Gen 2">Lenovo ThinkPad P16 Gen 2 (Core i9, 64GB RAM)</option>
                          </select>
                        </div>
                      )}

                      {isSecurity && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="sec-check"
                            checked={securityAcknowledged}
                            onChange={(e) => setSecurityAcknowledged(e.target.checked)}
                          />
                          <label htmlFor="sec-check" style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                            I confirm that I have reviewed the Zensar SOC-2 Trust Services & Information Security Guidelines.
                          </label>
                        </div>
                      )}

                      <button
                        className="btn-primary"
                        onClick={() => handleSubmitTask(task)}
                        disabled={submittingTaskId === task.id || (isSecurity && !securityAcknowledged)}
                        style={{ padding: '7px 18px', fontSize: '0.82rem' }}
                      >
                        {submittingTaskId === task.id ? 'Verifying with Action Registry...' : 'Submit & Execute Two-Phase Verification'}
                      </button>
                    </div>
                  )}

                  {/* Verification Metadata if VERIFIED */}
                  {isVerified && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: 'var(--accent-emerald)',
                      background: '#f0fdf4',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: '1px solid #dcfce7'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✓</span>
                        <span>Two-Phase Atomic State Mutation Confirmed</span>
                        {task.completed_at && (
                          <span style={{ color: 'var(--text-dim)', marginLeft: '8px' }}>
                            Completed: {new Date(task.completed_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                        SEALED IN AUDIT LEDGER
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 3: CASES & RECEIPTS ================= */}
      {activeSubTab === 'cases' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Autonomous HR Cases & Cryptographic Action Receipts
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Tamper-evident audit ledger tracking each autonomous mutation with SHA-256 receipts.
              </p>
            </div>
            <button className="btn-secondary" onClick={loadCases} style={{ padding: '6px 14px', fontSize: '0.80rem' }}>
              🔄 Refresh Receipts
            </button>
          </div>

          {loadingCases ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Loading HR cases...</div>
          ) : cases.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
              No HR cases generated yet. Ask Harper to apply for leave, submit tax declaration, or order a laptop to generate cryptographic receipts.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cases.map((c) => (
                <div key={c.id} className="glass-panel" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-indigo">{c.category}</span>
                      <h3 style={{ fontSize: '1.0rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {c.title}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-emerald">{c.status}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
                    {c.description}
                  </p>

                  {/* Actions inside case */}
                  {c.actions.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginTop: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Action: <span style={{ color: 'var(--accent-primary)' }}>{act.action_name}</span>
                        </div>
                        <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                          TWO-PHASE VERIFIED ✓
                        </span>
                      </div>

                      {/* Cryptographic SHA-256 Receipt */}
                      {act.receipt_hash && (
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                              SHA-256 Non-Repudiation Receipt:
                            </span>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#0f172a', wordBreak: 'break-all' }}>
                              {act.receipt_hash}
                            </div>
                          </div>
                          <button
                            onClick={() => copyReceipt(act.receipt_hash!)}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                          >
                            {copiedHash === act.receipt_hash ? '✓ Copied' : 'Copy Hash'}
                          </button>
                        </div>
                      )}

                      {/* Verification details */}
                      {act.result_payload && (
                        <div style={{ marginTop: '8px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {act.result_payload.tracking_number && (
                            <div>IT Tracking Number: <strong>{act.result_payload.tracking_number}</strong> (SLA: {act.result_payload.delivery_sla_hours}h)</div>
                          )}
                          {act.result_payload.leave_balance_remaining !== undefined && (
                            <div>Remaining PTO Balance: <strong>{act.result_payload.leave_balance_remaining} days</strong></div>
                          )}
                          {act.result_payload.verification_notes && (
                            <div style={{ color: 'var(--accent-emerald)', marginTop: '2px' }}>
                              ✓ {act.result_payload.verification_notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
