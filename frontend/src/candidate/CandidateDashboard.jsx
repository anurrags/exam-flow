import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const fmtDate = (d) => d ? new Date(d).toLocaleString() : null;

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const candidateId = localStorage.getItem('candidateId');
  const candidateName = localStorage.getItem('candidateName');
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/candidate/${candidateId}/dashboard`)
      .then(res => setTests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [candidateId]);

  const handleLogout = () => {
    localStorage.removeItem('candidateId');
    localStorage.removeItem('candidateName');
    localStorage.removeItem('candidateEmail');
    navigate('/login');
  };

  const available = tests.filter(t => t.status === 'AVAILABLE');
  const completed = tests.filter(t => t.status === 'COMPLETED');
  const inProgress = tests.filter(t => t.status === 'IN_PROGRESS');

  const TestCard = ({ t }) => {
    const isCompleted = t.status === 'COMPLETED';
    const isExpired = t.isExpired && t.status !== 'COMPLETED';
    const isInProgress = t.status === 'IN_PROGRESS';

    return (
      <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="flex-between">
          <div style={{ flex: 1 }}>
            <div className="flex-gap" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{t.title}</h3>
              {t.isPrivate && <span className="badge badge-warning">🔒 Private</span>}
              {isCompleted && <span className="badge badge-success">✅ Completed</span>}
              {isInProgress && <span className="badge badge-primary">⏳ In Progress</span>}
              {isExpired && <span className="badge badge-gray">⏰ Expired</span>}
            </div>
            <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)', fontSize: '0.82rem', flexWrap: 'wrap' }}>
              <span>⏱ {t.durationMinutes} min</span>
              <span>❓ {t.questionCount} questions</span>
              <span>⭐ {t.totalMarks} marks</span>
              {t.expiresAt && <span>📅 Expires: {fmtDate(t.expiresAt)}</span>}
            </div>
          </div>
        </div>

        {/* Score for completed tests */}
        {isCompleted && t.percentage !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '10px 16px'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Your Score</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: t.percentage >= 40 ? '#34d399' : '#f87171' }}>
                {t.percentage}% — {t.marksObtained}/{t.totalMarks}
              </div>
            </div>
            <span className={`badge ${t.percentage >= 40 ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto' }}>
              {t.percentage >= 40 ? '✅ PASS' : '❌ FAIL'}
            </span>
          </div>
        )}

        {/* Answer visibility notice */}
        {isCompleted && t.answersVisible === false && t.answersVisibleAfter && (
          <div className="alert alert-info" style={{ marginBottom: 0 }}>
            📅 Answers will be visible after {fmtDate(t.answersVisibleAfter)}
          </div>
        )}

        <div>
          {isCompleted && t.sessionId ? (
            <button className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/test/${t.testId}/done?session=${t.sessionId}`)}>
              📊 View Result
            </button>
          ) : !isExpired && !isCompleted ? (
            <button className="btn btn-primary btn-sm"
              onClick={() => navigate(`/test/${t.testId}/instructions`)}>
              {isInProgress ? '▶ Continue Test' : '▶ Start Test'}
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-brand">🎓 <span>ExamFlow</span></div>
        <div className="flex-gap">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>👤 {candidateName}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 36, paddingBottom: 60 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="page-title">Welcome back, {candidateName?.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">Your tests and results</p>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            {/* In Progress */}
            {inProgress.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <h2 className="section-title">⏳ In Progress</h2>
                <div className="grid-2">{inProgress.map(t => <TestCard key={t.testId} t={t} />)}</div>
              </div>
            )}

            {/* Available */}
            <div style={{ marginBottom: 36 }}>
              <h2 className="section-title">📋 Available Tests</h2>
              {available.length === 0 ? (
                <div className="card empty-state" style={{ padding: '40px 24px' }}>
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">No tests available right now</div>
                  <div className="empty-desc">Check back later for new tests</div>
                </div>
              ) : (
                <div className="grid-2">{available.map(t => <TestCard key={t.testId} t={t} />)}</div>
              )}
            </div>

            {/* Completed */}
            {completed.length > 0 && (
              <div>
                <h2 className="section-title">✅ Completed Tests</h2>
                <div className="grid-2">{completed.map(t => <TestCard key={t.testId} t={t} />)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
