/* eslint-disable react-hooks/set-state-in-effect, no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function Instructions() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testInfo, setTestInfo] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [alreadyAttempted, setAlreadyAttempted] = useState(null);

  const candidateId = localStorage.getItem('candidateId');
  const candidateEmail = localStorage.getItem('candidateEmail');
  const candidateName = localStorage.getItem('candidateName');

  useEffect(() => {
    if (!candidateId) { navigate('/login'); return; }
    api.get(`/api/candidate/test/${testId}/info?candidateId=${candidateId}`)
      .then(res => setTestInfo(res.data))
      .catch(() => navigate('/dashboard'));
  }, [testId, candidateId]);

  const handleStart = async () => {
    setStarting(true); setError('');
    try {
      const res = await api.post(`/api/candidate/test/${testId}/start`, {
        candidateName, candidateEmail
      });

      sessionStorage.setItem(`session_${testId}`, JSON.stringify(res.data));

      // Enter fullscreen, then navigate
      try { await document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ }
      navigate(`/test/${testId}/take`);
    } catch (e) {
      if (e.response?.status === 409) {
        // Already attempted
        setAlreadyAttempted(e.response.data);
      } else {
        setError(e.response?.data?.error || 'Failed to start test. Please try again.');
      }
      setStarting(false);
    }
  };

  const rules = [
    { icon: '🖥️', text: 'The test must be taken in fullscreen mode. Exiting fullscreen will show a re-enter prompt.' },
    { icon: '🚫', text: 'Do not switch tabs or minimize the browser. After 3 tab switches, test auto-submits.' },
    { icon: '⏱️', text: `You have ${testInfo?.durationMinutes || '—'} minutes. The test auto-submits when time runs out.` },
    { icon: '📋', text: 'Copying, pasting, or right-clicking is disabled during the test.' },
    { icon: '✅', text: 'You can navigate between questions and mark them for review.' },
    { icon: '📤', text: 'Once submitted, you cannot retake this test.' },
  ];

  if (alreadyAttempted) {
    return (
      <div className="page-center">
        <div className="card fade-in" style={{ maxWidth: 440, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔒</div>
          <h2 style={{ marginBottom: 8 }}>Already Attempted</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            You have already {alreadyAttempted.completed ? 'completed' : 'started'} this test.
            {alreadyAttempted.submittedAt && (
              <><br/><span style={{ fontSize: '0.85rem' }}>Submitted: {new Date(alreadyAttempted.submittedAt).toLocaleString()}</span></>
            )}
          </p>
          <div className="flex-gap" style={{ justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>← Dashboard</button>
            {alreadyAttempted.sessionId && (
              <button className="btn btn-primary"
                onClick={() => navigate(`/test/${testId}/done?session=${alreadyAttempted.sessionId}`)}>
                📊 View Result
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center" style={{ background: 'radial-gradient(ellipse at 70% 20%, rgba(99,102,241,0.08) 0%, transparent 60%)' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div className="card fade-in">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{testInfo?.title || 'Loading...'}</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>Read all instructions before starting</p>
          </div>

          {testInfo?.instructions && (
            <div className="card card-elevated" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--primary-light)' }}>📌 Test Instructions</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{testInfo.instructions}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <span className="badge badge-primary">⏱ {testInfo?.durationMinutes} min</span>
            <span className="badge badge-primary">❓ {testInfo?.questionCount} questions</span>
            <span className="badge badge-primary">⭐ {testInfo?.totalMarks} marks</span>
          </div>

          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.95rem' }}>⚠️ Rules & Anti-Cheating</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {rules.map((r, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '10px 14px',
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{r.icon}</span>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{r.text}</span>
              </div>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="flex-gap">
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back</button>
            <button className="btn btn-primary btn-lg" style={{ flex: 1, justifyContent: 'center' }}
              onClick={handleStart} disabled={starting}>
              {starting ? '⏳ Starting...' : '🖥️ Enter Fullscreen & Start'}
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 10 }}>
            By proceeding you agree to the test rules above
          </p>
        </div>
      </div>
    </div>
  );
}
