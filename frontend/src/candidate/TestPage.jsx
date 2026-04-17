/* eslint-disable react-hooks/set-state-in-effect, no-unused-vars */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const MAX_TAB_SWITCHES = 3;

export default function TestPage() {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [violationMsg, setViolationMsg] = useState(null); // { icon, message }
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showFsPrompt, setShowFsPrompt] = useState(false); // changed: prompt instead of auto-enter

  const timerRef = useRef(null);
  const submittedRef = useRef(false);
  const tabSwitchesRef = useRef(0);
  const autoSubmitRef = useRef(false);
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // ── Autosave ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(async () => {
      try {
        const s = JSON.parse(sessionStorage.getItem(`session_${testId}`));
        if (s?.sessionId && Object.keys(answersRef.current).length > 0 && !submittedRef.current) {
          await api.post('/api/candidate/test/autosave', {
            sessionId: s.sessionId,
            answers: answersRef.current
          });
        }
      } catch (e) {
        // ignore
      }
    }, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, [session, testId]);

  // ── Log violation ──────────────────────────────────────────────────────────
  const logViolation = useCallback(async (type) => {
    try {
      const s = JSON.parse(sessionStorage.getItem(`session_${testId}`));
      if (s?.sessionId) await api.post('/api/candidate/test/violation', { sessionId: s.sessionId, type });
    } catch (e) {
      // ignore
    }
  }, [testId]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);
    setSubmitting(true);
    setShowSubmitModal(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      const s = JSON.parse(sessionStorage.getItem(`session_${testId}`));
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const res = await api.post('/api/candidate/test/submit', {
        sessionId: s.sessionId, answers, timeTakenSeconds: timeTaken,
      });
      sessionStorage.setItem(`result_${testId}`, JSON.stringify(res.data));
      navigate(`/test/${testId}/done`);
    } catch {
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [testId, answers, startTime, navigate]);
  // ── Load session data ──────────────────────────────────────────────────────
  useEffect(() => {
    const data = sessionStorage.getItem(`session_${testId}`);
    if (!data) { navigate('/dashboard'); return; }
    const parsed = JSON.parse(data);
    setSession(parsed);
    setQuestions(parsed.questions || []);
    setTimeLeft((parsed.durationMinutes || 30) * 60);
  }, [testId]);

  // ── Countdown Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [session]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && session && !submittedRef.current) {
      handleSubmit(true);
    }
  }, [timeLeft, session]);

  // ── Auto-submit on 3 tab switches ──────────────────────────────────────────
  useEffect(() => {
    if (tabSwitches >= MAX_TAB_SWITCHES && !autoSubmitRef.current && !submittedRef.current) {
      autoSubmitRef.current = true;
      // Auto-submit after short delay so user sees the modal briefly
      const t = setTimeout(() => handleSubmit(true), 2500);
      return () => clearTimeout(t);
    }
  }, [tabSwitches, handleSubmit]);

  // ── Anti-cheat: Fullscreen ────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setShowFsPrompt(true);       // Show re-enter prompt (requires user click)
        logViolation('FULLSCREEN_EXIT');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const reEnterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setShowFsPrompt(false);
    } catch (e) {
      // ignore
    }
  };

  // ── Anti-cheat: Tab Switch ─────────────────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        logViolation('TAB_SWITCH');
        setTabSwitches(prev => {
          const next = prev + 1;
          tabSwitchesRef.current = next;
          if (next >= MAX_TAB_SWITCHES) {
            setViolationMsg({
              icon: '🚨',
              message: `You have switched tabs ${MAX_TAB_SWITCHES} times. Your test is being automatically submitted in 3 seconds.`,
              isFinal: true,
            });
          } else {
            setViolationMsg({
              icon: '⚠️',
              message: `Tab switch detected! (${next}/${MAX_TAB_SWITCHES}). After ${MAX_TAB_SWITCHES} switches your test will be auto-submitted.`,
              isFinal: false,
            });
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // ── Anti-cheat: Copy / Right-click ────────────────────────────────────────
  useEffect(() => {
    const prevent = (e) => { e.preventDefault(); };
    const preventLog = (e) => { e.preventDefault(); logViolation('COPY_ATTEMPT'); };
    const preventRC = (e) => { e.preventDefault(); logViolation('RIGHT_CLICK'); };
    document.addEventListener('contextmenu', preventRC);
    document.addEventListener('copy', preventLog);
    document.addEventListener('cut', preventLog);
    document.addEventListener('paste', prevent);
    return () => {
      document.removeEventListener('contextmenu', preventRC);
      document.removeEventListener('copy', preventLog);
      document.removeEventListener('cut', preventLog);
      document.removeEventListener('paste', prevent);
    };
  }, []);

  // ── Anti-cheat: Block Back Nav ─────────────────────────────────────────────
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const onPop = () => {
      window.history.pushState(null, '', window.location.href);
      logViolation('BACK_NAVIGATION');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Anti-cheat: DevTools ───────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      if (window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160) {
        logViolation('DEVTOOLS_OPEN');
      }
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);


  // ── Format time ────────────────────────────────────────────────────────────
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Answer handlers ────────────────────────────────────────────────────────
  const getAnswer = (qId) => answers[qId] || [];
  const setAnswer = (qId, value) => setAnswers(prev => ({ ...prev, [qId]: value }));
  const toggleOption = (qId, optText, isMulti) => {
    const curr = getAnswer(qId);
    setAnswer(qId, isMulti
      ? (curr.includes(optText) ? curr.filter(a => a !== optText) : [...curr, optText])
      : [optText]);
  };


  if (!session || !questions.length) return <div className="page-center"><div className="spinner" /></div>;

  const q = questions[current];
  const urgentTime = timeLeft <= session.durationMinutes * 60 * 0.2;
  const answeredCount = Object.keys(answers).filter(k => answers[k]?.length > 0).length;

  return (
    <div className="no-select" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* === Fullscreen Re-Entry Overlay === */}
      {showFsPrompt && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ textAlign: 'center', borderColor: 'rgba(239,68,68,0.5)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
            <div className="modal-title" style={{ color: 'var(--danger)' }}>Fullscreen Exited</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              Your test requires fullscreen mode. This violation has been logged.
              Please click the button below to return to fullscreen and continue.
            </p>
            <button className="btn btn-danger btn-lg" style={{ width: '100%', justifyContent: 'center' }}
              onClick={reEnterFullscreen}>
              🖥️ Return to Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', flexShrink: 0
      }}>
        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{session.testTitle}</div>
        <div className="flex-gap">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            ✅ {answeredCount}/{questions.length}
          </span>
          <div className={`timer ${urgentTime ? 'urgent' : ''}`}>{fmtTime(timeLeft)}</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowSubmitModal(true)} disabled={submitting}>
            {submitting ? 'Submitting...' : '📤 Submit'}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Question Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div className="slide-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className="badge badge-primary">Q{current + 1} of {questions.length}</span>
              <span className="badge badge-gray">{q.type.replace('_', ' ')}</span>
              <span className="badge badge-warning">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
              {marked.has(q.id) && <span className="badge badge-warning">📌 Marked</span>}
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.7, marginBottom: 24 }}>
              {q.questionText}
            </div>

            {/* MCQ */}
            {q.type === 'MCQ' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.options.map((opt, i) => (
                  <label key={i} className={`option-label ${getAnswer(q.id).includes(opt.optionText) ? 'selected' : ''}`}>
                    <input type="radio" name={`q${q.id}`} onChange={() => toggleOption(q.id, opt.optionText, false)} />
                    <span style={{ fontSize: '0.9rem' }}>{opt.optionText}</span>
                  </label>
                ))}
              </div>
            )}

            {/* MAQ */}
            {q.type === 'MAQ' && (
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Select all that apply</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {q.options.map((opt, i) => (
                    <label key={i} className={`option-label ${getAnswer(q.id).includes(opt.optionText) ? 'selected' : ''}`}>
                      <input type="checkbox" onChange={() => toggleOption(q.id, opt.optionText, true)} />
                      <span style={{ fontSize: '0.9rem' }}>{opt.optionText}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* TRUE_FALSE */}
            {q.type === 'TRUE_FALSE' && (
              <div style={{ display: 'flex', gap: 14 }}>
                {['True', 'False'].map(val => (
                  <label key={val} className={`option-label ${getAnswer(q.id).includes(val) ? 'selected' : ''}`}
                    style={{ flex: 1, justifyContent: 'center', padding: '18px', fontSize: '1rem' }}>
                    <input type="radio" name={`q${q.id}`} onChange={() => toggleOption(q.id, val, false)} />
                    {val === 'True' ? '✅ True' : '❌ False'}
                  </label>
                ))}
              </div>
            )}

            {/* SINGLE_VALUE */}
            {q.type === 'SINGLE_VALUE' && (
              <div className="form-group">
                <label className="form-label">Your Answer</label>
                <input className="form-input" style={{ fontSize: '1.05rem', padding: '14px 16px' }}
                  placeholder="Type your answer here..."
                  value={getAnswer(q.id)[0] || ''}
                  onChange={e => setAnswer(q.id, [e.target.value])} />
              </div>
            )}

            {/* Nav Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <button className="btn btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>← Prev</button>
              <button
                className={`btn ${marked.has(q.id) ? 'btn-secondary' : 'btn-ghost'}`}
                style={marked.has(q.id) ? { borderColor: 'var(--warning)', color: '#fbbf24' } : {}}
                onClick={() => setMarked(m => { const n = new Set(m); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}>
                {marked.has(q.id) ? '🔖 Marked' : '📌 Mark for Review'}
              </button>
              <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)} disabled={current === questions.length - 1}>Next →</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          width: 220, flexShrink: 0, overflowY: 'auto',
          padding: '20px 16px', borderLeft: '1px solid var(--border)', background: 'var(--bg-card)'
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Navigator
          </div>
          <div className="question-nav-grid">
            {questions.map((qn, i) => {
              const isAnswered = (answers[qn.id] || []).length > 0;
              const isMarked = marked.has(qn.id);
              return (
                <button key={qn.id}
                  className={`q-nav-btn ${i === current ? 'current' : isMarked ? 'marked' : isAnswered ? 'answered' : ''}`}
                  onClick={() => setCurrent(i)}>{i + 1}</button>
              );
            })}
          </div>
          <div className="divider" style={{ margin: '16px 0' }} />
          {[
            { cls: 'answered', label: 'Answered' },
            { cls: 'current', label: 'Current' },
            { cls: 'marked', label: 'Marked' },
            { cls: '', label: 'Not answered' },
          ].map(({ cls, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              <div className={`q-nav-btn ${cls}`} style={{ width: 18, height: 18, pointerEvents: 'none', fontSize: '0.6rem', borderRadius: 4 }}></div>
              <span>{label}</span>
            </div>
          ))}
          <div className="divider" style={{ margin: '16px 0' }} />
          <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setShowSubmitModal(true)} disabled={submitting}>📤 Submit Test</button>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">📤 Submit Test?</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>
              Answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
            </div>
            {questions.length - answeredCount > 0 && (
              <div className="alert alert-warning">⚠️ {questions.length - answeredCount} unanswered question(s) will be marked as skipped.</div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Once submitted, you cannot change your answers.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Review</button>
              <button className="btn btn-primary" onClick={() => handleSubmit(false)}>Confirm Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Violation Modal */}
      {violationMsg && (
        <div className="modal-overlay">
          <div className="modal" style={{ borderColor: violationMsg.isFinal ? 'rgba(239,68,68,0.5)' : undefined }}>
            <div className="violation-icon">{violationMsg.icon}</div>
            <div className="modal-title">{violationMsg.isFinal ? '🚨 Auto-Submitting' : '⚠️ Violation Detected'}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>{violationMsg.message}</p>
            {!violationMsg.isFinal && (
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setViolationMsg(null)}>I Understand</button>
            )}
            {violationMsg.isFinal && (
              <div className="progress-bar" style={{ marginTop: 12 }}>
                <div className="progress-fill progress-danger" style={{ width: '100%', animation: 'shrink 2.5s linear forwards' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
