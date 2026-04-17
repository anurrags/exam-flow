import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function AdminLogin() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/admin/login', { token });
      localStorage.setItem('adminToken', res.data.token);
      navigate('/admin/dashboard');
    } catch {
      setError('Invalid admin password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center" style={{ background: 'radial-gradient(ellipse at 60% 30%, rgba(99,102,241,0.12) 0%, transparent 60%)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 16px', boxShadow: '0 4px 20px rgba(99,102,241,0.4)'
          }}>🎓</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 6 }}>
            <span className="gradient-text">ExamFlow</span> Admin
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Sign in to manage tests and results</p>
        </div>

        <div className="card fade-in">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && <div className="alert alert-error">⚠️ {error}</div>}

            <div className="form-group">
              <label className="form-label">Admin Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter admin password"
                value={token}
                onChange={e => setToken(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</> : '🔐 Sign In'}
            </button>
          </form>

          <div className="divider" />
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            Default password: <code style={{ color: 'var(--primary-light)', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: 4 }}>admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
