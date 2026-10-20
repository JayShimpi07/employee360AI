import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

interface CandidateInterviewProps {
  initialToken?: string;
  initialEmail?: string;
  onExit: () => void;
}

interface DialogueTurn {
  speaker: 'AI' | 'CANDIDATE';
  text: string;
  turnIndex: number;
  time: string;
  latencyMs?: number;
}

export const CandidateInterview: React.FC<CandidateInterviewProps> = ({
  initialToken = '',
  initialEmail = '',
  onExit,
}) => {
  // Steps: 'verify' | 'hardware' | 'room' | 'completed'
  const [step, setStep] = useState<'verify' | 'hardware' | 'room' | 'completed'>('verify');
  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState(initialEmail);
  const [sessionData, setSessionData] = useState<any>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [recentInvites, setRecentInvites] = useState<any[]>([]);

  // Hardware Check State
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Live Interview Room State
  const [agentStatus, setAgentStatus] = useState<'LISTENING' | 'THINKING' | 'SPEAKING'>('LISTENING');
  const [dialogue, setDialogue] = useState<DialogueTurn[]>([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [candidateSpeechText, setCandidateSpeechText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Proctoring Pipeline State (PS2)
  const [proctorStatus, setProctorStatus] = useState<string>('Active (1 FPS)');
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const proctorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const proctorIntervalRef = useRef<any>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const turnsEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch recent active invites on verify step for 1-click test entry
  useEffect(() => {
    if (step === 'verify') {
      fetch('/api/v1/auth/candidate/recent-invites')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setRecentInvites(data);
        })
        .catch(() => {});
    }
  }, [step]);

  // Auto-verify if initialToken and initialEmail exist
  useEffect(() => {
    if (initialToken && initialEmail) {
      handleVerifyToken(initialToken, initialEmail);
    }
  }, [initialToken, initialEmail]);

  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue]);

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
      if (wsRef.current) wsRef.current.close();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const stopMediaStream = () => {
    if (proctorIntervalRef.current) {
      clearInterval(proctorIntervalRef.current);
      proctorIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Helper to extract clean token and email from user input or pasted link
  const sanitizeTokenInput = (val: string) => {
    let cleanTok = (val || '').trim();
    let detectedEmail = '';

    if (cleanTok.includes('token=')) {
      try {
        const urlObj = cleanTok.startsWith('http')
          ? new URL(cleanTok)
          : new URL(`http://dummy.com/${cleanTok.startsWith('?') ? '' : '?'}${cleanTok}`);
        const t = urlObj.searchParams.get('token');
        const e = urlObj.searchParams.get('email');
        if (t) cleanTok = t;
        if (e) detectedEmail = decodeURIComponent(e);
      } catch {
        const m = cleanTok.match(/token=([^&]+)/);
        if (m) cleanTok = m[1];
        const emMatch = cleanTok.match(/email=([^&]+)/);
        if (emMatch) detectedEmail = decodeURIComponent(emMatch[1]);
      }
    } else if (cleanTok.includes('&email=')) {
      const parts = cleanTok.split('&email=');
      cleanTok = parts[0];
      if (parts[1]) detectedEmail = decodeURIComponent(parts[1].split('&')[0]);
    } else if (cleanTok.includes('&')) {
      cleanTok = cleanTok.split('&')[0];
    }

    return { cleanTok, detectedEmail };
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { cleanTok, detectedEmail } = sanitizeTokenInput(raw);
    setToken(cleanTok);
    if (detectedEmail && (!email || email.trim() === '')) {
      setEmail(detectedEmail);
    }
  };

  const handleTokenPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      const { cleanTok, detectedEmail } = sanitizeTokenInput(pasted);
      if (cleanTok !== pasted || detectedEmail) {
        e.preventDefault();
        setToken(cleanTok);
        if (detectedEmail) {
          setEmail(detectedEmail);
        }
      }
    }
  };

  // 1. Verify Candidate Token
  const handleVerifyToken = async (tok: string, em: string) => {
    const { cleanTok, detectedEmail } = sanitizeTokenInput(tok);
    const targetToken = cleanTok.trim();
    const targetEmail = (detectedEmail || em || '').trim();

    if (!targetToken) {
      setVerifyError('Please enter or paste your invitation token.');
      return;
    }

    try {
      setVerifying(true);
      setVerifyError(null);
      const res = await fetch('/api/v1/auth/candidate/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: targetToken, candidate_email: targetEmail }),
      });
      const data = await res.json();
      if (data.valid && data.session_id) {
        setSessionData(data);
        setStep('hardware');
        startHardwareCheck();
      } else {
        setVerifyError(data.error_message || 'Invalid or expired interview invitation token.');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Token verification failed.');
    } finally {
      setVerifying(false);
    }
  };


  // 2. Hardware Permissions & Audio Visualizer
  const startHardwareCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
      setHasMic(true);

      // Audio Level Analyzer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!mediaStreamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.warn('Hardware permission request failed:', err);
      setHasCamera(false);
      setHasMic(false);
    }
  };

  // 3. Connect WebSocket & Enter Live Room
  const enterInterviewRoom = async () => {
    if (!sessionData) return;
    setStep('room');

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/v1/interview/${sessionData.session_id}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      // Request initial greeting
      ws.send(JSON.stringify({ type: 'init' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ai_turn') {
          setAgentStatus('SPEAKING');
          const turnTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setDialogue((prev) => [
            ...prev,
            {
              speaker: 'AI',
              text: msg.text,
              turnIndex: msg.turn_index,
              time: turnTime,
              latencyMs: msg.latency_ms,
            },
          ]);

          // Play Speech
          playSpeech(msg.text, msg.audio_base64);

          if (msg.is_completed) {
            setTimeout(() => setStep('completed'), 6000);
          }
        } else if (msg.type === 'turn_status') {
          setAgentStatus(msg.status);
        } else if (msg.type === 'session_completed') {
          setStep('completed');
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    // Initialize Web Speech Recognition
    initSpeechRecognition();

    // Start 1 FPS Video Keyframe Proctoring & Focus Monitoring (PS2)
    startProctoringStream(sessionData.session_id);
  };

  const startProctoringStream = (sessionId: string) => {
    // 1. Browser Event Monitoring
    const handleVisibility = () => {
      if (document.hidden) {
        api.recordBrowserEvent(sessionId, 'tab_switch', Date.now()).catch(() => {});
      }
    };
    const handleBlur = () => {
      api.recordBrowserEvent(sessionId, 'window_blur', Date.now()).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    // 2. 1 FPS Keyframe Sampler
    proctorIntervalRef.current = setInterval(() => {
      if (!pipVideoRef.current || !proctorCanvasRef.current || pipVideoRef.current.readyState < 2) return;
      const v = pipVideoRef.current;
      const c = proctorCanvasRef.current;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      c.width = 320;
      c.height = 240;
      ctx.drawImage(v, 0, 0, 320, 240);
      const b64 = c.toDataURL('image/jpeg', 0.65);
      api.analyzeProctoringFrame(sessionId, b64, Date.now())
        .then((res) => {
          if (res.is_anomalous) {
            setProctorStatus('Camera Notice: Please re-center');
          } else {
            setProctorStatus('Active (1 FPS)');
          }
        })
        .catch(() => {});
    }, 1200);
  };

  // Audio Playback
  const playSpeech = (text: string, base64Audio?: string) => {
    if (base64Audio) {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        audio.onended = () => {
          setAgentStatus('LISTENING');
        };
        audio.play().catch(() => {
          speakBrowserTTS(text);
        });
        return;
      } catch (err) {
        // Fallback to browser TTS
      }
    }
    speakBrowserTTS(text);
  };

  const speakBrowserTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setAgentStatus('LISTENING');
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setAgentStatus('LISTENING'), 3000);
    }
  };

  // Speech Recognition (Candidate Microphone)
  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCandidateSpeechText(transcript);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition event:', e.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        // Ignore duplicate start
      }
    }
  };

  // Candidate Sends Spoken Utterance
  const handleSendCandidateTurn = () => {
    const textToSend = candidateSpeechText.trim();
    if (!textToSend || !wsRef.current) return;

    const turnTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setDialogue((prev) => [
      ...prev,
      {
        speaker: 'CANDIDATE',
        text: textToSend,
        turnIndex: prev.length + 1,
        time: turnTime,
      },
    ]);

    setAgentStatus('THINKING');
    wsRef.current.send(
      JSON.stringify({
        type: 'candidate_turn',
        text: textToSend,
        latency_ms: 150.0,
      })
    );

    setCandidateSpeechText('');
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicMuted(!isMicMuted);
    }
  };

  // End Interview Early
  const handleEndInterview = async () => {
    if (confirm('Are you sure you want to end your interview session now?')) {
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'complete' }));
      }
      setStep('completed');
    }
  };

  // RENDER STEP 1: Verify Invitation Token
  if (step === 'verify') {
    return (
      <div style={{ maxWidth: '520px', margin: '60px auto', padding: '24px' }}>
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'var(--accent-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.3rem',
              color: '#ffffff',
              marginBottom: '12px',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
            }}>
              360
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>Candidate Interview Portal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '4px' }}>
              Autonomous Evidence-Driven Evaluation &bull; Zensar
            </p>
          </div>

          {verifyError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}>
              {verifyError}
            </div>
          )}

          {recentInvites.length > 0 && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '18px',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '8px'
              }}>
                ⚡ Quick Fill Active Invite (1-Click Test)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentInvites.map((inv) => (
                  <button
                    key={inv.session_id}
                    type="button"
                    onClick={() => {
                      setToken(inv.invite_token);
                      setEmail(inv.candidate_email);
                      handleVerifyToken(inv.invite_token, inv.candidate_email);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>
                        {inv.candidate_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {inv.candidate_email}
                      </div>
                    </div>
                    <span className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                      {inv.job_title} &bull; Enter &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleVerifyToken(token, email); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>Invitation Token</label>
              <input
                type="text"
                value={token}
                onChange={handleTokenChange}
                onPaste={handleTokenPaste}
                placeholder="Paste invitation token or full interview URL"
                required
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                💡 Tip: You can paste the entire invitation URL or token fragment here; email will auto-fill.
              </span>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>Candidate Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                required
                style={{ width: '100%' }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }} disabled={verifying}>
              {verifying ? 'Verifying Credentials...' : 'Verify & Enter Check-in'}
            </button>
            <button type="button" className="btn-secondary" onClick={onExit} style={{ justifyContent: 'center' }}>
              Cancel & Return
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RENDER STEP 2: Hardware Permissions & Consent Check-in
  if (step === 'hardware') {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px' }}>
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ marginBottom: '24px' }}>
            <span className="badge badge-indigo">Pre-Interview System Check</span>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginTop: '8px' }}>
              Welcome, {sessionData?.candidate_name}!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
              Position: <strong>{sessionData?.job_title}</strong> &bull; Zensar Technologies
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Camera Preview */}
            <div>
              <div style={{
                width: '100%',
                height: '240px',
                background: '#0f172a',
                borderRadius: '10px',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid var(--border-subtle)',
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {!hasCamera && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                  }}>
                    Camera permission required
                  </div>
                )}
              </div>
            </div>

            {/* Checklist & Audio Meter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: hasCamera ? '#16a34a' : '#dc2626', fontSize: '1.2rem', fontWeight: 700 }}>
                  {hasCamera ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  Camera: {hasCamera ? 'Connected & Operational' : 'Awaiting Permission'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: hasMic ? '#16a34a' : '#dc2626', fontSize: '1.2rem', fontWeight: 700 }}>
                  {hasMic ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  Microphone: {hasMic ? 'Audio Input Detected' : 'Awaiting Permission'}
                </span>
              </div>

              {/* Live Audio Level Meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Microphone Signal Level</span>
                  <span style={{ fontWeight: 600 }}>{audioLevel}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${audioLevel}%`,
                    height: '100%',
                    background: 'var(--accent-primary)',
                    transition: 'width 0.1s ease',
                  }} />
                </div>
              </div>

              {/* Consent Box */}
              <div style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                marginTop: '10px',
              }}>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={consentAgreed}
                    onChange={(e) => setConsentAgreed(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    I agree to participate in this AI-assisted interview session. I understand that speech transcripts and evaluation evidence will be recorded for HR review.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={onExit}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!consentAgreed}
              onClick={enterInterviewRoom}
              style={{ opacity: consentAgreed ? 1 : 0.5 }}
            >
              Enter AI Interview Room →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER STEP 3: Live Spoken Interview Room
  if (step === 'room') {
    return (
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: wsConnected ? '#16a34a' : '#dc2626',
            }} />
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{sessionData?.job_title}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginLeft: '10px' }}>
                Candidate: <strong>{sessionData?.candidate_name}</strong>
              </span>
            </div>
          </div>

          {/* AI Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isRecording && (
              <span className="badge badge-cyan">Mic Listening 🎙️</span>
            )}
            <span className={`badge ${agentStatus === 'SPEAKING' ? 'badge-indigo' : agentStatus === 'THINKING' ? 'badge-amber' : 'badge-emerald'}`}>
              AI Status: {agentStatus}
            </span>
            <button className="btn-secondary" onClick={handleEndInterview} style={{ padding: '6px 12px', fontSize: '0.80rem', color: '#b91c1c', borderColor: '#fecaca' }}>
              End Session
            </button>
          </div>
        </div>

        {/* Main Room Grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', overflow: 'hidden' }}>
          {/* Left Column: AI Avatar & Candidate Video */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* AI Avatar Pulse Box */}
            <div className="glass-panel" style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              position: 'relative',
            }}>
              {/* Clean Corporate AI Avatar */}
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: agentStatus === 'SPEAKING' ? 'var(--accent-primary)' : agentStatus === 'THINKING' ? '#d97706' : '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.3s ease',
                marginBottom: '16px',
              }}>
                <div style={{
                  width: '104px',
                  height: '104px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: agentStatus === 'SPEAKING' ? 'var(--accent-primary)' : agentStatus === 'THINKING' ? '#d97706' : '#16a34a',
                  fontWeight: 800,
                  fontSize: '1.6rem',
                }}>
                  AI
                </div>
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>Alex (AI Interviewer)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
                Senior Technical Evaluation Specialist
              </p>
            </div>

            {/* Candidate PIP Webcam Box with Real-Time Proctoring HUD */}
            <div className="glass-panel" style={{ height: '210px', overflow: 'hidden', position: 'relative', background: '#0f172a' }}>
              <video
                ref={(el) => {
                  pipVideoRef.current = el;
                  if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                    el.srcObject = mediaStreamRef.current;
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <canvas ref={proctorCanvasRef} style={{ display: 'none' }} />
              
              {/* Security Shield HUD Badge */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 10,
              }}>
                <span className={`badge ${proctorStatus.includes('Notice') ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '0.68rem', backdropFilter: 'blur(4px)' }}>
                  🛡️ {proctorStatus}
                </span>
              </div>

              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '12px',
                background: 'rgba(15, 23, 42, 0.75)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.74rem',
                color: '#ffffff',
              }}>
                {sessionData?.candidate_name} (Camera Active)
              </div>
            </div>
          </div>

          {/* Right Column: Live Conversation Dialogue Stream & Mic Controls */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                Live Spoken Dialogue Transcript ({dialogue.length} turns)
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                English Speech Audio Engine
              </span>
            </div>

            {/* Scrollable Dialogue List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '8px' }}>
              {dialogue.map((turn, idx) => {
                const isAI = turn.speaker === 'AI';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf: isAI ? 'flex-start' : 'flex-end',
                      maxWidth: '82%',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                      alignSelf: isAI ? 'flex-start' : 'flex-end',
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isAI ? 'var(--accent-primary)' : '#15803d' }}>
                        {isAI ? 'Alex (AI Interviewer)' : sessionData?.candidate_name}
                      </span>
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>
                        {turn.time}
                      </span>
                      {turn.latencyMs && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                          {turn.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <div style={{
                      background: isAI ? '#f1f5f9' : '#eff6ff',
                      border: `1px solid ${isAI ? 'var(--border-subtle)' : '#bfdbfe'}`,
                      borderRadius: isAI ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                      padding: '12px 16px',
                      fontSize: '0.90rem',
                      lineHeight: '1.45',
                      color: isAI ? 'var(--text-main)' : '#1e3a8a',
                    }}>
                      {turn.text}
                    </div>
                  </div>
                );
              })}
              <div ref={turnsEndRef} />
            </div>

            {/* Bottom Microphone Control Bar */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              {/* Real-time Candidate Speech Preview */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={candidateSpeechText}
                  onChange={(e) => setCandidateSpeechText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendCandidateTurn(); }}
                  placeholder="Speak naturally into your microphone (or type response)..."
                  style={{ flex: 1 }}
                />
                <button
                  className="btn-primary"
                  onClick={handleSendCandidateTurn}
                  disabled={!candidateSpeechText.trim()}
                  style={{ padding: '9px 18px' }}
                >
                  Send Response →
                </button>
                <button
                  className="btn-secondary"
                  onClick={toggleMic}
                  style={{ padding: '9px 14px', color: isMicMuted ? '#dc2626' : 'inherit' }}
                  title="Toggle Microphone"
                >
                  {isMicMuted ? 'Mic Muted 🔇' : 'Mic Active 🎙️'}
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>
                Microphone speech is automatically transcribed in real time. Press 'Send Response' after completing your spoken answer.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER STEP 4: Interview Completed Screen
  return (
    <div style={{ maxWidth: '640px', margin: '60px auto', padding: '24px' }}>
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#f0fdf4',
          border: '2px solid #16a34a',
          color: '#16a34a',
          fontSize: '1.8rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800 }}>Interview Session Concluded</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '6px' }}>
          Thank you, <strong>{sessionData?.candidate_name}</strong>. Your spoken answers have been recorded and mapped to job competencies.
        </p>

        <div style={{
          background: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '18px',
          margin: '24px 0',
          textAlign: 'left',
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-dim)' }}>Session Reference:</span>
            <code>{sessionData?.session_id}</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-dim)' }}>Position:</span>
            <span style={{ fontWeight: 600 }}>{sessionData?.job_title}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-dim)' }}>Dialogue Turns Recorded:</span>
            <span style={{ fontWeight: 600 }}>{dialogue.length} turns</span>
          </div>
        </div>

        <button className="btn-primary" onClick={onExit} style={{ justifyContent: 'center', width: '100%' }}>
          Return to Hub
        </button>
      </div>
    </div>
  );
};
