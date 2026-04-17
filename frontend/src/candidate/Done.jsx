/* eslint-disable react-hooks/set-state-in-effect, no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function Done() {
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    const local = sessionStorage.getItem(`result_${testId}`);
    if (local) {
      setResult(JSON.parse(local));
      setLoading(false);
      return;
    }
    const sessionId = searchParams.get('session');
    if (sessionId) {
      api.get(`/api/candidate/test/result/${sessionId}`)
        .then(res => setResult(res.data))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [testId, searchParams]);

  if (loading) return <div className="page-center"><div className="spinner" /></div>;

  if (!result) {
    return (
      <div className="page-center">
        <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>😕</div>
          <h2>Result Not Found</h2>
          <p style={{ color: 'var(--text-muted)' }}>Contact the administrator if you believe this is an error.</p>
          <button className="btn btn-secondary" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}
            onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const pct = result.percentage || 0;
  const pass = pct >= 40;
  const fmtTime = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '';

  return (
    <div className="page-center" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.1) 0%, transparent 60%)' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div className="card fade-in" style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>{pass ? '🎉' : '😔'}</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>
            {pass ? 'Congratulations!' : 'Test Completed'}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
            {result.candidateName} — your result is ready
          </p>

          {/* Score Circle */}
          <div style={{ marginBottom: 28 }}>
            <div className="score-circle">
              <div className="score-inner">
                <div className="score-percent" style={{ color: pass ? '#34d399' : '#f87171' }}>{pct}%</div>
                <div className="score-label">{result.marksObtained}/{result.totalMarks}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <span className={`badge ${pass ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.95rem', padding: '6px 18px' }}>
                {pass ? '✅ PASS' : '❌ FAIL'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: '✅ Correct', value: result.correctAnswers, color: '#34d399' },
              { label: '❌ Incorrect', value: result.incorrectAnswers, color: '#f87171' },
              { label: '— Skipped', value: result.skippedAnswers, color: 'var(--text-muted)' },
              { label: '⏱ Time Taken', value: fmtTime(result.timeTakenSeconds), color: 'var(--primary-light)' },
            ].map(s => (
              <div key={s.label} className="card card-elevated" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {result.violationCount > 0 && (
            <div className="alert alert-warning" style={{ textAlign: 'left' }}>
              ⚠️ {result.violationCount} violation(s) were recorded during this test
            </div>
          )}

          {/* Answer visibility */}
          {result.answersVisible === false ? (
            <div className="alert alert-info" style={{ marginBottom: 8 }}>
              🔒 Answers are not available yet.
              {result.answersVisibleAfter && (
                <> They will be visible after <strong>{fmtDate(result.answersVisibleAfter)}</strong>.</>
              )}
            </div>
          ) : result.breakdown?.length > 0 ? (
            <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setShowBreakdown(!showBreakdown)}>
              {showBreakdown ? '▲ Hide Breakdown' : '▼ View Question Breakdown'}
            </button>
          ) : null}

          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>

        {/* Breakdown */}
        {showBreakdown && result.breakdown && (
          <div className="fade-in">
            {result.breakdown.map((b, i) => (
              <div key={i} className={`breakdown-card ${b.isSkipped ? 'skipped' : b.isCorrect ? 'correct' : 'incorrect'}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.9rem', flex: 1 }}>Q{i + 1}: {b.questionText}</strong>
                  <span className={`badge ${b.isSkipped ? 'badge-gray' : b.isCorrect ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 12, flexShrink: 0 }}>
                    {b.isSkipped ? 'Skipped' : b.isCorrect ? `+${b.marks}` : '✗ Wrong'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Your answer: </span>
                  <span style={{ color: b.isCorrect ? '#34d399' : '#f87171' }}>{b.givenAnswers?.join(', ') || '—'}</span>
                  {!b.isCorrect && !b.isSkipped && (
                    <><span style={{ marginLeft: 16 }}>Correct: </span><span style={{ color: '#34d399' }}>{b.correctAnswers?.join(', ')}</span></>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
