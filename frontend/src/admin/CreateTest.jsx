import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const QUESTION_TYPES = [
  { value: 'MCQ', label: 'MCQ', desc: 'Single correct option' },
  { value: 'MAQ', label: 'MAQ', desc: 'Multiple correct options' },
  { value: 'SINGLE_VALUE', label: 'Single Value', desc: 'Text/number answer' },
  { value: 'TRUE_FALSE', label: 'True / False', desc: 'Binary choice' },
];

const emptyQuestion = () => ({
  questionText: '',
  type: 'MCQ',
  marks: 1,
  options: ['', '', '', ''],
  correctAnswers: [],
});

export default function CreateTest() {
  const { testId } = useParams();
  const isEdit = !!testId;
  const navigate = useNavigate();

  const [meta, setMeta] = useState({
    title: '', instructions: '', durationMinutes: 30,
    shuffleQuestions: true, shuffleOptions: true, expiresAt: '',
    isPrivate: false, allowedEmails: '', showAnswers: 'IMMEDIATELY'
  });
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.get(`/api/admin/tests/${testId}`).then(res => {
        const t = res.data;
        setMeta({
          title: t.title, instructions: t.instructions || '',
          durationMinutes: t.durationMinutes,
          shuffleQuestions: t.shuffleQuestions, shuffleOptions: t.shuffleOptions,
          expiresAt: t.expiresAt ? t.expiresAt.substring(0, 16) : '',
          isPrivate: t.isPrivate || false,
          allowedEmails: (t.allowedEmails || []).join(', '),
          showAnswers: t.showAnswers || 'IMMEDIATELY'
        });
        if (t.questions?.length) {
          setQuestions(t.questions.map(q => ({
            questionText: q.questionText, type: q.type, marks: q.marks,
            options: q.options?.map(o => o.optionText) || (q.type === 'TRUE_FALSE' ? ['True', 'False'] : ['', '']),
            correctAnswers: q.correctAnswers || [],
          })));
        }
      }).catch(() => navigate('/admin/dashboard'));
    }
  }, [testId]);

  const updateQuestion = (idx, field, value) => {
    setQuestions(qs => {
      const updated = [...qs];
      updated[idx] = { ...updated[idx], [field]: value };

      if (field === 'type') {
        if (value === 'TRUE_FALSE') updated[idx].options = ['True', 'False'];
        else if (value === 'SINGLE_VALUE') updated[idx].options = [];
        else if (!updated[idx].options.length) updated[idx].options = ['', '', '', ''];
        updated[idx].correctAnswers = [];
      }
      return updated;
    });
  };

  const updateOption = (qIdx, oIdx, value) => {
    setQuestions(qs => {
      const updated = [...qs];
      const opts = [...updated[qIdx].options];
      opts[oIdx] = value;
      updated[qIdx] = { ...updated[qIdx], options: opts };
      return updated;
    });
  };

  const addOption = (qIdx) => {
    setQuestions(qs => {
      const updated = [...qs];
      updated[qIdx] = { ...updated[qIdx], options: [...updated[qIdx].options, ''] };
      return updated;
    });
  };

  const removeOption = (qIdx, oIdx) => {
    setQuestions(qs => {
      const updated = [...qs];
      const opts = updated[qIdx].options.filter((_, i) => i !== oIdx);
      const correct = updated[qIdx].correctAnswers.filter(a => a !== updated[qIdx].options[oIdx]);
      updated[qIdx] = { ...updated[qIdx], options: opts, correctAnswers: correct };
      return updated;
    });
  };

  const toggleCorrect = (qIdx, optionText, isMultiple) => {
    setQuestions(qs => {
      const updated = [...qs];
      const current = updated[qIdx].correctAnswers;
      if (isMultiple) {
        updated[qIdx] = {
          ...updated[qIdx],
          correctAnswers: current.includes(optionText)
            ? current.filter(a => a !== optionText)
            : [...current, optionText]
        };
      } else {
        updated[qIdx] = { ...updated[qIdx], correctAnswers: [optionText] };
      }
      return updated;
    });
  };

  const addQuestion = () => setQuestions(qs => [...qs, emptyQuestion()]);
  const removeQuestion = (idx) => setQuestions(qs => qs.filter((_, i) => i !== idx));

  const validate = () => {
    if (!meta.title.trim()) return 'Test title is required';
    if (meta.durationMinutes < 1) return 'Duration must be at least 1 minute';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return `Question ${i + 1} text is empty`;
      if (q.type !== 'SINGLE_VALUE') {
        const filled = q.options.filter(o => o.trim());
        if (filled.length < 2) return `Question ${i + 1} needs at least 2 options`;
        if (!q.correctAnswers.length) return `Question ${i + 1} must have at least one correct answer marked`;
      } else {
        if (!q.correctAnswers.length) return `Question ${i + 1} needs a correct answer`;
      }
    }
    return null;
  };

  const handleSave = async (publish = false) => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setSaving(true);
    try {
      const allowedEmailsList = meta.allowedEmails
        ? meta.allowedEmails.split(',').map(e => e.trim()).filter(Boolean)
        : [];
      const payload = {
        ...meta,
        allowedEmails: allowedEmailsList,
        expiresAt: meta.expiresAt ? meta.expiresAt + ':00' : null,
        questions: questions.map(q => ({
          questionText: q.questionText,
          type: q.type,
          marks: q.marks,
          options: q.type !== 'SINGLE_VALUE' ? q.options.filter(o => o.trim()) : [],
          correctAnswers: q.correctAnswers,
        }))
      };

      let testRes;
      if (isEdit) {
        testRes = await api.put(`/api/admin/tests/${testId}`, payload);
      } else {
        testRes = await api.post('/api/admin/tests', payload);
      }

      if (publish) {
        await api.post(`/api/admin/tests/${testRes.data.id}/publish`);
      }

      navigate('/admin/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save test.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-brand">🎓 <span>ExamFlow</span> Admin</div>
        <div className="flex-gap">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')}>← Dashboard</button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 className="page-title">{isEdit ? '✏️ Edit Test' : '➕ Create Test'}</h1>
          <p className="page-subtitle">Configure test settings and add questions</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

        {/* Test Meta */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="section-title">⚙️ Test Settings</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Test Title *</label>
              <input className="form-input" placeholder="e.g. JavaScript Fundamentals Quiz"
                value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Instructions</label>
              <textarea className="form-textarea" rows={3} placeholder="Instructions shown to candidates before starting..."
                value={meta.instructions} onChange={e => setMeta(m => ({ ...m, instructions: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (minutes) *</label>
              <input type="number" min={1} className="form-input" value={meta.durationMinutes}
                onChange={e => setMeta(m => ({ ...m, durationMinutes: parseInt(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Expires At (optional)</label>
              <input type="datetime-local" className="form-input" value={meta.expiresAt}
                onChange={e => setMeta(m => ({ ...m, expiresAt: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Show Answers to Candidates</label>
              <select className="form-select" value={meta.showAnswers}
                onChange={e => setMeta(m => ({ ...m, showAnswers: e.target.value }))}>
                <option value="IMMEDIATELY">✅ Immediately after submission</option>
                <option value="AFTER_EXPIRY">⏰ After test expires</option>
                <option value="NEVER">🔒 Never show answers</option>
              </select>
            </div>

            <div className="flex-gap" style={{ gap: 24, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={meta.shuffleQuestions}
                  onChange={e => setMeta(m => ({ ...m, shuffleQuestions: e.target.checked }))} />
                <span style={{ fontSize: '0.9rem' }}>Shuffle questions per candidate</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={meta.shuffleOptions}
                  onChange={e => setMeta(m => ({ ...m, shuffleOptions: e.target.checked }))} />
                <span style={{ fontSize: '0.9rem' }}>Shuffle answer options</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={meta.isPrivate}
                  onChange={e => setMeta(m => ({ ...m, isPrivate: e.target.checked }))} />
                <span style={{ fontSize: '0.9rem' }}>🔒 Private test (invite only)</span>
              </label>
            </div>

            {meta.isPrivate && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Allowed Email Addresses (comma-separated)</label>
                <textarea className="form-textarea" rows={3}
                  placeholder="student1@email.com, student2@email.com, ..."
                  value={meta.allowedEmails}
                  onChange={e => setMeta(m => ({ ...m, allowedEmails: e.target.value }))} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Only these candidates will see this test in their dashboard</span>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>❓ Questions ({questions.length})</h2>
          <button className="btn btn-secondary btn-sm" onClick={addQuestion}>＋ Add Question</button>
        </div>

        {questions.map((q, qIdx) => (
          <div key={qIdx} className="card fade-in" style={{ marginBottom: 16, border: '1px solid var(--border)' }}>
            <div className="flex-between" style={{ marginBottom: 14 }}>
              <span style={{ fontWeight: 700, color: 'var(--primary-light)', fontSize: '0.9rem' }}>Q{qIdx + 1}</span>
              <div className="flex-gap">
                <span className="badge badge-primary">{QUESTION_TYPES.find(t => t.value === q.type)?.label}</span>
                {questions.length > 1 && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeQuestion(qIdx)}>✕ Remove</button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Question Text *</label>
                <textarea className="form-textarea" placeholder="Enter your question here..."
                  value={q.questionText} onChange={e => updateQuestion(qIdx, 'questionText', e.target.value)} rows={2} />
              </div>
              <div className="form-group">
                <label className="form-label">Question Type</label>
                <select className="form-select" value={q.type} onChange={e => updateQuestion(qIdx, 'type', e.target.value)}>
                  {QUESTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label} – {t.desc}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Marks</label>
                <input type="number" min={1} className="form-input" value={q.marks}
                  onChange={e => updateQuestion(qIdx, 'marks', parseInt(e.target.value) || 1)} />
              </div>
            </div>

            {/* Options for MCQ/MAQ/TRUE_FALSE */}
            {q.type !== 'SINGLE_VALUE' && (
              <div>
                <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>
                  Options {q.type === 'MAQ' ? '(check all correct)' : '(select correct answer)'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type={q.type === 'MAQ' ? 'checkbox' : 'radio'}
                        name={`correct-${qIdx}`}
                        checked={q.correctAnswers.includes(opt)}
                        onChange={() => toggleCorrect(qIdx, opt, q.type === 'MAQ')}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                        title="Mark as correct"
                      />
                      <input
                        className="form-input"
                        placeholder={`Option ${oIdx + 1}`}
                        value={opt}
                        readOnly={q.type === 'TRUE_FALSE'}
                        onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {q.type !== 'TRUE_FALSE' && q.options.length > 2 && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeOption(qIdx, oIdx)}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                {q.type !== 'TRUE_FALSE' && q.options.length < 8 && (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, color: 'var(--primary-light)' }} onClick={() => addOption(qIdx)}>
                    ＋ Add Option
                  </button>
                )}
              </div>
            )}

            {/* Single Value answer */}
            {q.type === 'SINGLE_VALUE' && (
              <div className="form-group">
                <label className="form-label">Correct Answer (exact match, case-insensitive)</label>
                <input className="form-input" placeholder="e.g. 42  or  Paris"
                  value={q.correctAnswers[0] || ''}
                  onChange={e => updateQuestion(qIdx, 'correctAnswers', [e.target.value])} />
              </div>
            )}
          </div>
        ))}

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <button className="btn btn-secondary" onClick={addQuestion}>＋ Add Another Question</button>
        </div>

        {/* Action Buttons */}
        <div className="card" style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', alignItems: 'center', padding: '18px 24px' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/dashboard')} disabled={saving}>Cancel</button>
          <button className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save as Draft'}
          </button>
          <button className="btn btn-success" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Publishing...' : '🚀 Save & Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
