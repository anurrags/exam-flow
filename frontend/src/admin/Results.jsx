import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function Results() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/api/admin/tests/${testId}`),
      api.get(`/api/admin/tests/${testId}/results`)
    ]).then(([testRes, resRes]) => {
      setTest(testRes.data);
      setResults(resRes.data);
    }).catch(() => navigate('/admin/dashboard'))
      .finally(() => setLoading(false));
  }, [testId]);

  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / results.length)
    : 0;

  const passed = results.filter(r => (r.percentage || 0) >= 40).length;

  const fmtTime = (s) => s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—';

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-brand">🎓 <span>ExamFlow</span> Admin</div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')}>← Dashboard</button>
      </nav>

      <div className="container" style={{ paddingTop: 36, paddingBottom: 60 }}>
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 className="page-title">📊 {test?.title}</h1>
              <p className="page-subtitle">Test results — {results.length} candidate(s)</p>
            </div>

            {/* Stats */}
            <div className="grid-3" style={{ marginBottom: 32 }}>
              <div className="stat-card">
                <div className="stat-label">Candidates</div>
                <div className="stat-value gradient-text">{results.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Average Score</div>
                <div className="stat-value" style={{ color: '#818cf8' }}>{avg}%</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Pass Rate (≥40%)</div>
                <div className="stat-value" style={{ color: '#34d399' }}>
                  {results.length ? Math.round((passed / results.length) * 100) : 0}%
                </div>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-title">No submissions yet</div>
                <div className="empty-desc">Share the test link for candidates to take the test</div>
              </div>
            ) : (
              <>
                <div className="table-wrap" style={{ marginBottom: 24 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Score</th>
                        <th>%</th>
                        <th>✅ Correct</th>
                        <th>❌ Wrong</th>
                        <th>— Skipped</th>
                        <th>⚠️ Violations</th>
                        <th>⏱ Time</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <>
                          <tr key={r.sessionId}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{r.candidateName}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.candidateEmail}</div>
                            </td>
                            <td>{r.marksObtained != null ? `${r.marksObtained} / ${r.totalMarks}` : '—'}</td>
                            <td>
                              {r.percentage != null ? (
                                <span className={`badge ${r.percentage >= 40 ? 'badge-success' : 'badge-danger'}`}>
                                  {r.percentage}%
                                </span>
                              ) : '—'}
                            </td>
                            <td style={{ color: '#34d399' }}>{r.correctAnswers ?? '—'}</td>
                            <td style={{ color: '#f87171' }}>{r.incorrectAnswers ?? '—'}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{r.skippedAnswers ?? '—'}</td>
                            <td>
                              {r.violationCount > 0 ? (
                                <span className="badge badge-warning">⚠ {r.violationCount}</span>
                              ) : <span className="badge badge-success">✓ 0</span>}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{fmtTime(r.timeTakenSeconds)}</td>
                            <td>
                              {r.forceSubmitted
                                ? <span className="badge badge-danger">Force Submit</span>
                                : r.completed
                                  ? <span className="badge badge-success">Completed</span>
                                  : <span className="badge badge-gray">In Progress</span>}
                            </td>
                            <td>
                              <button className="btn btn-ghost btn-sm"
                                onClick={() => setExpanded(expanded === i ? null : i)}>
                                {expanded === i ? '▲ Hide' : '▼ Details'}
                              </button>
                            </td>
                          </tr>
                          {expanded === i && r.breakdown && (
                            <tr key={`exp-${i}`}>
                              <td colSpan={10} style={{ background: 'var(--bg)', padding: 20 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  {/* Violations */}
                                  {r.violations?.length > 0 && (
                                    <div className="card" style={{ marginBottom: 8, padding: '14px 18px', borderColor: 'rgba(245,158,11,0.3)' }}>
                                      <div style={{ fontWeight: 700, marginBottom: 8, color: '#fbbf24' }}>⚠️ Violations</div>
                                      {r.violations.map((v, vi) => (
                                        <div key={vi} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 3 }}>
                                          {new Date(v.timestamp).toLocaleTimeString()} — {v.type.replace(/_/g, ' ')}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Breakdown */}
                                  {r.breakdown.map((b, bi) => (
                                    <div key={bi} className={`breakdown-card ${b.isSkipped ? 'skipped' : b.isCorrect ? 'correct' : 'incorrect'}`}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <strong style={{ fontSize: '0.9rem' }}>Q{bi + 1}: {b.questionText}</strong>
                                        <span className={`badge ${b.isSkipped ? 'badge-gray' : b.isCorrect ? 'badge-success' : 'badge-danger'}`}>
                                          {b.isSkipped ? 'Skipped' : b.isCorrect ? `+${b.marks}` : '✗'}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        <span>Given: </span><span style={{ color: 'var(--text)' }}>{b.givenAnswers?.join(', ') || '—'}</span>
                                        {!b.isCorrect && <><span style={{ marginLeft: 16 }}>Correct: </span><span style={{ color: '#34d399' }}>{b.correctAnswers?.join(', ')}</span></>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
