import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function Start() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testInfo, setTestInfo] = useState(null);
  const [form, setForm] = useState({ candidateName: '', candidateEmail: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/api/test/${testId}/info`)
      .then(res => setTestInfo(res.data))
      .catch(err => setError(err.response?.data?.error || 'This test is not available.'))
      .finally(() => setLoading(false));
  }, [testId]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.candidateName.trim() || !form.candidateEmail.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    sessionStorage.setItem(`candidate_${testId}`, JSON.stringify(form));
    navigate(`/test/${testId}/instructions`);
  };

  if (loading) return <div className="page-center"><div className="spinner" /></div>;

  return (
    <div className="page-center" style={{ background: 'radial-gradient(ellipse at 40% 60%, rgba(14,165,233,0.1) 0%, transparent 60%)' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 16px', boxShadow: '0 4px 20px rgba(14,165,233,0.35)'
          }}>📝</div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800 }} className="gradient-text">ExamFlow</h1>
          <p style={{ color: 'var(--text-muted)' }}>Online Assessment Platform</p>
        </div>

        {error ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚫</div>
            <h2 style={{ marginBottom: 8 }}>Test Unavailable</h2>
            <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
        ) : testInfo ? (
          <div className="card fade-in">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>{testInfo.title}</h2>
            <div className="flex-gap" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
              <span className="badge badge-primary">⏱ {testInfo.durationMinutes} min</span>
              <span className="badge badge-primary">❓ {testInfo.questionCount} questions</span>
              <span className="badge badge-primary">⭐ {testInfo.totalMarks} marks</span>
            </div>

            <div className="divider" />

            <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
              {error && <div className="alert alert-error">⚠️ {error}</div>}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Enter your full name" value={form.candidateName}
                  onChange={e => setForm(f => ({ ...f, candidateName: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input type="email" className="form-input" placeholder="Enter your email" value={form.candidateEmail}
                  onChange={e => setForm(f => ({ ...f, candidateEmail: e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                {submitting ? 'Starting...' : '→ Continue to Instructions'}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
