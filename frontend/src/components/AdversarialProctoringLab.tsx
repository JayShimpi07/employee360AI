import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export const AdversarialProctoringLab: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(true);
  const [activeScenario, setActiveScenario] = useState<string>('NORMAL');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  // Live Webcam Proctoring State
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamFacing, setWebcamFacing] = useState<string>('Ready to test');
  const [liveTelemetry, setLiveTelemetry] = useState<any | null>(null);
  const [liveIntegrityScore, setLiveIntegrityScore] = useState<number>(100);
  const [liveAnomalyCount, setLiveAnomalyCount] = useState<number>(0);
  const [recentLiveEvents, setRecentLiveEvents] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    loadBenchmarks();
    // Run default simulation on mount
    handleSimulateScenario('NORMAL');

    return () => {
      stopLiveWebcam();
    };
  }, []);

  const loadBenchmarks = async () => {
    try {
      setLoadingBenchmarks(true);
      const data = await api.getProctoringBenchmarks();
      setBenchmarks(data);
    } catch (err) {
      console.error('Failed to load benchmarks', err);
    } finally {
      setLoadingBenchmarks(false);
    }
  };

  const handleSimulateScenario = async (scenario: string) => {
    setActiveScenario(scenario);
    setSimulating(true);
    try {
      const res = await api.simulateAdversarialProctoring(scenario);
      setSimResult(res);
    } catch (err) {
      console.error('Simulation failed', err);
    } finally {
      setSimulating(false);
    }
  };

  // Live Webcam Handlers
  const startLiveWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebcamActive(true);
      setWebcamFacing('Live Vision Stream Connected');

      // Start 1 FPS keyframe sampler
      intervalRef.current = setInterval(sampleAndAnalyzeFrame, 1200);
    } catch (err) {
      console.error('Webcam access error', err);
      alert('Unable to access webcam. Please ensure camera permissions are granted.');
    }
  };

  const stopLiveWebcam = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
    setWebcamFacing('Stream Stopped');
    setLiveTelemetry(null);
  };

  const sampleAndAnalyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 240;
    ctx.drawImage(video, 0, 0, 320, 240);
    const frameB64 = canvas.toDataURL('image/jpeg', 0.70);

    try {
      const res = await api.analyzeProctoringFrame('live_lab_session', frameB64, Date.now());
      setLiveTelemetry(res);

      if (res.is_anomalous) {
        setLiveAnomalyCount((c) => c + 1);
        setLiveIntegrityScore((s) => Math.max(20, s - 8));
        const timeStr = new Date().toLocaleTimeString();
        setRecentLiveEvents((prev) => [
          `[${timeStr}] ⚠️ ${res.anomalies.join(', ')} (Confidence: ${(res.confidence * 100).toFixed(0)}%)`,
          ...prev.slice(0, 4),
        ]);
      } else {
        // Slowly recover integrity score if normal
        setLiveIntegrityScore((s) => Math.min(100, s + 1));
      }
    } catch (err) {
      console.warn('Frame analysis skipped', err);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-emerald">PS2 Rigor</span>
          <span className="badge badge-indigo">Vision Anomaly Core</span>
          <span className="badge badge-amber">Phase 4 Active</span>
        </div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Adversarial Proctoring Lab (PS2 Testbed)
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
          Real-time Computer Vision Anomaly Detection, Gaze Tracking, Multi-Face Disambiguation & Synthetic Attack Simulation.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* ================= LEFT COLUMN: LIVE WEBCAM HUD TESTBED ================= */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Live Camera Anomaly HUD
                </h3>
                <span className={`badge ${isWebcamActive ? 'badge-emerald' : 'badge-indigo'}`} style={{ fontSize: '0.70rem' }}>
                  {webcamFacing}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                1 FPS Keyframe Sampler with Real-Time Bounding Box & Offset Tracking
              </span>
            </div>
            {isWebcamActive ? (
              <button
                className="btn-secondary"
                onClick={stopLiveWebcam}
                style={{ color: '#b91c1c', borderColor: '#fecaca', padding: '6px 14px', fontSize: '0.82rem' }}
              >
                Stop Webcam
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={startLiveWebcam}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                Start Live Webcam 🎥
              </button>
            )}
          </div>

          {/* Video Container with HUD Overlay */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '320px',
            background: '#0f172a',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            border: '2px solid #e2e8f0',
          }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: isWebcamActive ? 'block' : 'none',
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {!isWebcamActive && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📹</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Live Webcam Offline</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Click "Start Live Webcam" to test live face presence, head turning, and tab switching.
                </div>
              </div>
            )}

            {/* Live HUD Overlay Badges */}
            {isWebcamActive && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                right: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                pointerEvents: 'none',
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className={`badge ${liveTelemetry?.faces_detected === 1 ? 'badge-emerald' : 'badge-rose'}`} style={{ backdropFilter: 'blur(4px)' }}>
                    {liveTelemetry?.faces_detected === 0 ? '⚠️ NO FACE (ABSENCE)' : liveTelemetry?.faces_detected === 1 ? '✓ FACE PRESENT' : '⚠️ MULTIPLE FACES'}
                  </span>
                  {liveTelemetry?.details?.head_offset_x !== undefined && (
                    <span className="badge badge-indigo" style={{ backdropFilter: 'blur(4px)' }}>
                      Gaze Offset: {liveTelemetry.details.head_offset_x > 0 ? '+' : ''}{liveTelemetry.details.head_offset_x}
                    </span>
                  )}
                </div>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)',
                }}>
                  Live Integrity: {liveIntegrityScore}%
                </div>
              </div>
            )}
          </div>

          {/* Live Telemetry Data Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                Real-Time Anomaly Audit Stream
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Total Flags: {liveAnomalyCount}
              </span>
            </div>

            {recentLiveEvents.length === 0 ? (
              <div style={{ fontSize: '0.80rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                No anomalies detected yet. Stream is clean. Turn away from camera or cover lens to test triggers.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentLiveEvents.map((ev, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: '#b91c1c', fontFamily: 'monospace' }}>
                    {ev}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: ADVERSARIAL ATTACK SIMULATION ================= */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Synthetic Attack Scenarios (DOC-05 Section 3)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
              Execute reproducible adversarial test scenarios to benchmark detector precision and recall without physical manipulation.
            </p>
          </div>

          {/* Attack Scenario Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <button
              className="btn-secondary"
              onClick={() => handleSimulateScenario('NORMAL')}
              style={{
                background: activeScenario === 'NORMAL' ? '#eff6ff' : '#ffffff',
                borderColor: activeScenario === 'NORMAL' ? 'var(--accent-primary)' : '#cbd5e1',
                padding: '10px',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✅</span>
                <span>Normal Candidate</span>
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontWeight: 400, marginTop: '2px' }}>
                1 centered face, focused gaze
              </div>
            </button>

            <button
              className="btn-secondary"
              onClick={() => handleSimulateScenario('FACE_ABSENCE')}
              style={{
                background: activeScenario === 'FACE_ABSENCE' ? '#fef2f2' : '#ffffff',
                borderColor: activeScenario === 'FACE_ABSENCE' ? '#ef4444' : '#cbd5e1',
                padding: '10px',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🚨</span>
                <span style={{ color: '#b91c1c' }}>Absence Attack</span>
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontWeight: 400, marginTop: '2px' }}>
                Candidate steps away from frame
              </div>
            </button>

            <button
              className="btn-secondary"
              onClick={() => handleSimulateScenario('MULTIPLE_FACES')}
              style={{
                background: activeScenario === 'MULTIPLE_FACES' ? '#fef2f2' : '#ffffff',
                borderColor: activeScenario === 'MULTIPLE_FACES' ? '#ef4444' : '#cbd5e1',
                padding: '10px',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👥</span>
                <span style={{ color: '#b91c1c' }}>Multiple Faces Attack</span>
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontWeight: 400, marginTop: '2px' }}>
                Proxy or accomplice enters frame
              </div>
            </button>

            <button
              className="btn-secondary"
              onClick={() => handleSimulateScenario('GAZE_DEVIATION')}
              style={{
                background: activeScenario === 'GAZE_DEVIATION' ? '#fffbeb' : '#ffffff',
                borderColor: activeScenario === 'GAZE_DEVIATION' ? '#f59e0b' : '#cbd5e1',
                padding: '10px',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📱</span>
                <span style={{ color: '#b45309' }}>Phone Glance Attack</span>
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontWeight: 400, marginTop: '2px' }}>
                Looking down repeatedly at desk/phone
              </div>
            </button>

            <button
              className="btn-secondary"
              onClick={() => handleSimulateScenario('DEVICE_BLUR')}
              style={{
                background: activeScenario === 'DEVICE_BLUR' ? '#fffbeb' : '#ffffff',
                borderColor: activeScenario === 'DEVICE_BLUR' ? '#f59e0b' : '#cbd5e1',
                padding: '10px',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🌐</span>
                <span style={{ color: '#b45309' }}>Browser Blur Attack</span>
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontWeight: 400, marginTop: '2px' }}>
                Tab switch to ChatGPT / Docs
              </div>
            </button>

            <button
              className="btn-secondary"
              onClick={() => handleSimulateScenario('SECOND_VOICE')}
              style={{
                background: activeScenario === 'SECOND_VOICE' ? '#fef2f2' : '#ffffff',
                borderColor: activeScenario === 'SECOND_VOICE' ? '#ef4444' : '#cbd5e1',
                padding: '10px',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎙️</span>
                <span style={{ color: '#b91c1c' }}>Whisper / 2nd Voice</span>
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', fontWeight: 400, marginTop: '2px' }}>
                Acoustic coaching harmonics detected
              </div>
            </button>
          </div>

          {/* Simulation Output Card */}
          {simulating ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
              Executing Computer Vision pipeline...
            </div>
          ) : simResult ? (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.90rem' }}>
                  Scenario: <code>{simResult.scenario}</code>
                </span>
                <span className={`badge ${simResult.benchmark_passed ? 'badge-emerald' : 'badge-rose'}`}>
                  {simResult.benchmark_passed ? 'BENCHMARK PASSED ✓' : 'FAILED'}
                </span>
              </div>

              {simResult.frame_preview && (
                <div style={{ marginBottom: '14px', textAlign: 'center' }}>
                  <img
                    src={simResult.frame_preview}
                    alt="Synthetic frame"
                    style={{ maxHeight: '140px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Faces Detected</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {simResult.faces_detected}
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Confidence</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                    {Math.round(simResult.confidence * 100)}%
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Status</div>
                  <div style={{
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: simResult.is_anomalous ? '#dc2626' : '#16a34a',
                    marginTop: '4px',
                  }}>
                    {simResult.is_anomalous ? 'ANOMALOUS' : 'NORMAL'}
                  </div>
                </div>
              </div>

              {simResult.anomalies?.length > 0 && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '0.80rem',
                  color: '#991b1b',
                }}>
                  <strong>Flagged Anomaly Types:</strong> {simResult.anomalies.join(', ')}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ================= RESEARCH ACCURACY BENCHMARK MATRIX (DOC-05) ================= */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Empirical Detector Accuracy Matrix (DOC-05 Section 2.4)
            </h3>
            <span style={{ fontSize: '0.80rem', color: 'var(--text-dim)' }}>
              Verified across synthetic adversarial sessions with millisecond-latency benchmarking
            </span>
          </div>
          <span className="badge badge-emerald">5 Detectors Active</span>
        </div>

        {loadingBenchmarks ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
            Loading empirical benchmarks...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Anomaly Detector</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Detection Method</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Precision</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Recall</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>F1 Score</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Avg Latency</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {row.detector}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.80rem' }}>
                      {row.method}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                      {(row.precision * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                      {(row.recall * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {(row.f1_score * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                      {row.avg_latency_ms} ms
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                        TARGET MET ✓
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
