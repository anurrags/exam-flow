import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CandidateLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('candidateId')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/api/candidate/login', form);
      localStorage.setItem('candidateId', res.data.id);
      localStorage.setItem('candidateName', res.data.name);
      localStorage.setItem('candidateEmail', res.data.email);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-center" style={{ background: 'radial-gradient(ellipse at 60% 30%, rgba(14,165,233,0.1) 0%, transparent 60%)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 16px', boxShadow: '0 4px 20px rgba(14,165,233,0.35)'
          }}>📝</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }} className="gradient-text">ExamFlow</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to access your tests</p>
        </div>

        <div className="card fade-in">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="your@email.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="Your password"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Signing in...' : '→ Sign In'}
            </button>
          </form>
          <div className="divider" />
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No account? <Link to="/register" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: 600 }}>Register here</Link>
          </p>
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 8 }}>
            Admin? <Link to="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Admin Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
