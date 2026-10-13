import React, { useState, useEffect, useRef } from 'react';

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

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const turnsEndRef = useRef<HTMLDivElement | null>(null);

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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // 1. Verify Candidate Token
  const handleVerifyToken = async (tok: string, em: string) => {
    if (!tok || !em) return;
    try {
      setVerifying(true);
      setVerifyError(null);
      const res = await fetch('/api/v1/auth/candidate/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok, candidate_email: em }),
      });
      const data = await res.json();
      if (data.valid && data.session_id) {
        setSessionData(data);
        setStep('hardware');
        startHardwareCheck();
      } else {
        setVerifyError('Invalid or expired interview invitation token.');
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
              borderRadius: '14px',
              background: 'var(--gradient-brand)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.4rem',
              color: '#ffffff',
              marginBottom: '12px',
            }}>
              360
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Candidate Interview Portal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '4px' }}>
              Autonomous Evidence-Driven Evaluation
            </p>
          </div>

          {verifyError && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              color: '#fda4af',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}>
              {verifyError}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleVerifyToken(token, email); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Invitation Token</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your invitation token"
                required
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Candidate Email</label>
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
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px' }}>
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
                background: '#040711',
                borderRadius: '12px',
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
                    color: 'var(--text-dim)',
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
                <span style={{ color: hasCamera ? '#34d399' : '#f87171', fontSize: '1.2rem' }}>
                  {hasCamera ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: '0.9rem', color: hasCamera ? '#f8fafc' : 'var(--text-muted)' }}>
                  Camera: {hasCamera ? 'Connected & Operational' : 'Awaiting Permission'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: hasMic ? '#34d399' : '#f87171', fontSize: '1.2rem' }}>
                  {hasMic ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: '0.9rem', color: hasMic ? '#f8fafc' : 'var(--text-muted)' }}>
                  Microphone: {hasMic ? 'Audio Input Detected' : 'Awaiting Permission'}
                </span>
              </div>

              {/* Live Audio Level Meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Microphone Signal Level</span>
                  <span>{audioLevel}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${audioLevel}%`,
                    height: '100%',
                    background: 'var(--gradient-brand)',
                    transition: 'width 0.1s ease',
                  }} />
                </div>
              </div>

              {/* Consent Box */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
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
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          background: 'rgba(17, 24, 39, 0.8)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: wsConnected ? '#34d399' : '#f87171',
              boxShadow: wsConnected ? '0 0 8px #34d399' : 'none',
            }} />
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>{sessionData?.job_title}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginLeft: '10px' }}>
                Candidate: {sessionData?.candidate_name}
              </span>
            </div>
          </div>

          {/* AI Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isRecording && (
              <span className="badge badge-cyan">Mic Listening 🎙️</span>
            )}
            <span className={`badge ${agentStatus === 'SPEAKING' ? 'badge-indigo' : agentStatus === 'THINKING' ? 'badge-amber' : 'badge-emerald'}`}>
              AI Status: {agentStatus}
            </span>
            <button className="btn-secondary" onClick={handleEndInterview} style={{ padding: '6px 14px', fontSize: '0.82rem', color: '#fda4af' }}>
              End Session
            </button>
          </div>
        </div>

        {/* Main Room Grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '420px 1fr', gap: '20px', overflow: 'hidden' }}>
          {/* Left Column: AI Avatar & Candidate Video */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* AI Avatar Pulse Box */}
            <div className="glass-panel" style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '28px',
              textAlign: 'center',
              position: 'relative',
            }}>
              {/* Animated Glowing Pulse Avatar */}
              <div style={{
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                background: agentStatus === 'SPEAKING'
                  ? 'linear-gradient(135deg, #6366f1, #d946ef)'
                  : agentStatus === 'THINKING'
                  ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                  : 'linear-gradient(135deg, #10b981, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: agentStatus === 'SPEAKING'
                  ? '0 0 36px rgba(99, 102, 241, 0.6)'
                  : '0 0 20px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease',
                marginBottom: '18px',
              }}>
                <div style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  background: '#090d16',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.8rem',
                }}>
                  AI
                </div>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Alex (AI Interviewer)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
                Senior Technical Evaluation Specialist
              </p>
            </div>

            {/* Candidate PIP Webcam Box */}
            <div className="glass-panel" style={{ height: '220px', overflow: 'hidden', position: 'relative' }}>
              <video
                ref={(el) => {
                  if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                    el.srcObject = mediaStreamRef.current;
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '12px',
                background: 'rgba(0,0,0,0.6)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#f8fafc',
              }}>
                {sessionData?.candidate_name} (Camera Active)
              </div>
            </div>
          </div>

          {/* Right Column: Live Conversation Dialogue Stream & Mic Controls */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Live Spoken Dialogue Transcript ({dialogue.length} turns)
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                English Speech Audio Engine
              </span>
            </div>

            {/* Scrollable Dialogue List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '8px' }}>
              {dialogue.map((turn, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: turn.speaker === 'AI' ? 'flex-start' : 'flex-end',
                    maxWidth: '82%',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                    alignSelf: turn.speaker === 'AI' ? 'flex-start' : 'flex-end',
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: turn.speaker === 'AI' ? '#818cf8' : '#34d399' }}>
                      {turn.speaker === 'AI' ? 'Alex (AI Interviewer)' : sessionData?.candidate_name}
                    </span>
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>
                      {turn.time}
                    </span>
                    {turn.latencyMs && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '4px' }}>
                        {turn.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <div style={{
                    background: turn.speaker === 'AI' ? 'rgba(30, 41, 59, 0.75)' : 'rgba(99, 102, 241, 0.25)',
                    border: `1px solid ${turn.speaker === 'AI' ? 'var(--border-subtle)' : 'var(--border-highlight)'}`,
                    borderRadius: turn.speaker === 'AI' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                    padding: '12px 16px',
                    fontSize: '0.92rem',
                    lineHeight: '1.45',
                    color: '#f8fafc',
                  }}>
                    {turn.text}
                  </div>
                </div>
              ))}
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
                  style={{ padding: '10px 20px' }}
                >
                  Send Response →
                </button>
                <button
                  className="btn-secondary"
                  onClick={toggleMic}
                  style={{ padding: '10px 16px', color: isMicMuted ? '#f87171' : 'inherit' }}
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
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.2)',
          border: '2px solid #10b981',
          color: '#34d399',
          fontSize: '2rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Interview Session Concluded</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '6px' }}>
          Thank you, <strong>{sessionData?.candidate_name}</strong>. Your spoken answers have been recorded and mapped to job competencies.
        </p>

        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '18px',
          margin: '24px 0',
          textAlign: 'left',
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-dim)' }}>Session Reference:</span>
            <code style={{ color: '#93c5fd' }}>{sessionData?.session_id}</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-dim)' }}>Position:</span>
            <span>{sessionData?.job_title}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-dim)' }}>Dialogue Turns Recorded:</span>
            <span>{dialogue.length} turns</span>
          </div>
        </div>

        <button className="btn-primary" onClick={onExit} style={{ justifyContent: 'center', width: '100%' }}>
          Return to Hub
        </button>
      </div>
    </div>
  );
};
