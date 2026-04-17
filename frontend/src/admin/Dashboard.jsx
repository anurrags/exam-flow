import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const fmtDate = (d) => d ? new Date(d).toLocaleString() : '';

export default function Dashboard() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchTests = async () => {
    try {
      const res = await api.get('/api/admin/tests');
      setTests(res.data);
    } catch { navigate('/admin'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTests(); }, []);

  const handleLogout = () => { localStorage.removeItem('adminToken'); navigate('/admin'); };

  const handleDelete = async (id) => {
    await api.delete(`/api/admin/tests/${id}`);
    setDeleteId(null); fetchTests();
  };

  const togglePublish = async (test) => {
    await api.post(`/api/admin/tests/${test.id}/${test.isPublished ? 'unpublish' : 'publish'}`);
    fetchTests();
  };

  const handleCopy = async (id) => {
    await api.post(`/api/admin/tests/${id}/copy`);
    fetchTests();
  };

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/test/${id}/instructions`);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-brand">🎓 <span>ExamFlow</span> Admin</div>
        <div className="flex-gap">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/create')}>＋ New Test</button>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 40 }}>
        {/* Stats */}
        <div className="grid-3" style={{ marginBottom: 36 }}>
          <div className="stat-card">
            <div className="stat-label">Total Tests</div>
            <div className="stat-value gradient-text">{tests.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Published</div>
            <div className="stat-value" style={{ color: '#34d399' }}>{tests.filter(t => t.isPublished).length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Drafts</div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>{tests.filter(t => !t.isPublished).length}</div>
          </div>
        </div>

        <div className="flex-between" style={{ marginBottom: 20 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>📋 All Tests</h2>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/create')}>＋ New Test</button>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : tests.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">📄</div>
            <div className="empty-title">No tests yet</div>
            <div className="empty-desc">Create your first test to get started</div>
            <button className="btn btn-primary" onClick={() => navigate('/admin/create')}>＋ Create Test</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tests.map(test => {
              const isExpired = test.isExpired;
              const isLive = test.isPublished && !isExpired;
              return (
                <div key={test.id} className="card fade-in" style={{ padding: '20px 24px' }}>
                  <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div className="flex-gap" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{test.title}</h3>

                        {/* Status badge */}
                        {isLive ? (
                          <span
                            className="badge badge-success"
                            title={test.expiresAt ? `Expires: ${fmtDate(test.expiresAt)}` : 'No expiry set'}
                            style={{ cursor: 'help' }}>
                            ● Live {test.expiresAt ? `(expires ${fmtDate(test.expiresAt)})` : ''}
                          </span>
                        ) : isExpired ? (
                          <span
                            className="badge badge-danger"
                            title={`Expired: ${fmtDate(test.expiresAt)}`}
                            style={{ cursor: 'help' }}>
                            ⏰ Expired
                          </span>
                        ) : (
                          <span className="badge badge-warning">○ Draft</span>
                        )}

                        {test.isPrivate && <span className="badge badge-warning">🔒 Private</span>}
                      </div>
                      <div className="flex-gap" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', gap: 20, flexWrap: 'wrap' }}>
                        <span>⏱ {test.durationMinutes} min</span>
                        <span>❓ {test.questionCount} questions</span>
                        <span>📅 Show answers: <strong>{test.showAnswers || 'IMMEDIATELY'}</strong></span>
                        <span>🗓 Created: {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
                      {test.isPublished && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => copyLink(test.id)}>
                            📋 Copy Link
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/results/${test.id}`)}>
                            📊 Results
                          </button>
                        </>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/edit/${test.id}`)}>
                        ✏️ Edit
                      </button>
                      <button className="btn btn-secondary btn-sm" title="Duplicate this test" onClick={() => handleCopy(test.id)}>
                        📄 Copy
                      </button>
                      <button
                        className={`btn btn-sm ${test.isPublished ? 'btn-secondary' : 'btn-success'}`}
                        onClick={() => togglePublish(test)}>
                        {test.isPublished ? '⏸ Unpublish' : '🚀 Publish'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(test.id)}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🗑️ Delete Test?</div>
            <p style={{ color: 'var(--text-muted)' }}>This permanently deletes the test, questions, sessions, and results. Cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
