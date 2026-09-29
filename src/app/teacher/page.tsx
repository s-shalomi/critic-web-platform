'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './teacher.module.css';

interface StudentProgress {
  studentId: string;
  accessCode: string;
  topicTitle: string;
  currentStage: string;
  status: string;
  lastActive: string;
}

interface GeneratedCode {
  id: string;
  code: string;
  createdAt: string;
  expiresAt?: string;
}

interface Source {
  id: string;
  topicId: string;
  orderIndex: number;
  title: string;
  content: {
    type: string;
    authorName?: string;
    text: string;
  };
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [accessCodes, setAccessCodes] = useState<GeneratedCode[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  // Generator & Source Form state
  const [customCodeInput, setCustomCodeInput] = useState<string>('');
  const [newSourceTitle, setNewSourceTitle] = useState<string>('');
  const [newSourceAuthor, setNewSourceAuthor] = useState<string>('');
  const [newSourceText, setNewSourceText] = useState<string>('');
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [submittingSource, setSubmittingSource] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Fetch students & sources; auto-refresh student progress
  const fetchStudents = () => {
    fetch('/api/teachers/teacher-demo/students')
      .then((res) => res.json())
      .then((data) => {
        if (data.students) setStudents(data.students);
        if (data.accessCodes) setAccessCodes(data.accessCodes);
      })
      .catch((err) => console.error('fetchStudents error:', err));
  };

  const fetchSources = () => {
    fetch('/api/topics/climate-change/sources')
      .then((res) => res.json())
      .then((data) => {
        if (data.sources) setSources(data.sources);
      })
      .catch((err) => console.error('fetchSources error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // 1. Initial student, access code, and sources fetch
    fetchStudents();
    fetchSources();

    // 2. Poll student progress and sources every 8 seconds so teacher sees live stage updates
    const intervalId = setInterval(() => {
      fetchStudents();
      fetchSources();
    }, 8_000);
    return () => clearInterval(intervalId);
  }, []);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    try {
      const res = await fetch('/api/teachers/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: 'teacher-demo',
          customCode: customCodeInput,
        }),
      });

      const data = await res.json();
      if (data.success && data.accessCode) {
        setAccessCodes((prev) => [data.accessCode, ...prev]);
        setCustomCodeInput('');
        setMsg(`✨ Generated valid access code: ${data.accessCode.code}. Students can now log in immediately with this code!`);
      }
    } catch (err) {
      setMsg('Failed to generate code.');
    }
  };

  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceTitle || !newSourceText) return;

    setSubmittingSource(true);
    setMsg(null);

    try {
      if (editingSourceId) {
        // Edit existing source
        const res = await fetch(`/api/sources/${editingSourceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newSourceTitle,
            authorName: newSourceAuthor || 'Teacher Edited',
            text: newSourceText,
            type: 'article',
          }),
        });
        const data = await res.json();
        if (data.success && data.source) {
          setSources((prev) => prev.map((s) => (s.id === editingSourceId ? data.source : s)));
          setEditingSourceId(null);
          setNewSourceTitle('');
          setNewSourceAuthor('');
          setNewSourceText('');
          setMsg('✨ Source updated! Edits are now instantly live across student modules.');
        } else {
          setMsg('Failed to update source.');
        }
      } else {
        // Add new source
        const res = await fetch('/api/topics/climate-change/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newSourceTitle,
            authorName: newSourceAuthor || 'Teacher Added',
            text: newSourceText,
            type: 'article',
          }),
        });

        const data = await res.json();
        if (data.success && data.source) {
          setSources((prev) => [...prev, data.source]);
          setNewSourceTitle('');
          setNewSourceAuthor('');
          setNewSourceText('');
          setMsg('✨ New source published! It is now instantly live across all student modules.');
        } else {
          setMsg('Failed to publish source.');
        }
      }
    } catch (err) {
      setMsg('Error saving source.');
    } finally {
      setSubmittingSource(false);
    }
  };

  const handleStartEdit = (source: Source) => {
    setEditingSourceId(source.id);
    setNewSourceTitle(source.title);
    setNewSourceAuthor(source.content.authorName || '');
    setNewSourceText(source.content.text);
    setMsg(`Editing "${source.title}". Modify fields above and click Save.`);
  };

  const handleCancelEdit = () => {
    setEditingSourceId(null);
    setNewSourceTitle('');
    setNewSourceAuthor('');
    setNewSourceText('');
    setMsg(null);
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to remove this source from student modules?')) return;
    try {
      const res = await fetch(`/api/sources/${sourceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSources((prev) => prev.filter((s) => s.id !== sourceId));
        if (editingSourceId === sourceId) {
          handleCancelEdit();
        }
        setMsg('🗑️ Source removed. Change is instantly reflected across all student modules.');
      } else {
        setMsg('Failed to delete source.');
      }
    } catch (err) {
      setMsg('Error removing source.');
    }
  };

  const formatStage = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'familiarise':
        return '01. Familiarise (Gathering Evidence)';
      case 'conceptualise':
        return '02. Conceptualise (Concept Map)';
      case 'inquire':
        return '03. Inquire & Evaluate (Socratic Inquiry)';
      case 'synthesise':
        return '04. Synthesise (Closing Case)';
      case 'review':
        return '05. Case Debrief (Completed)';
      default:
        return stage || 'Starting Module';
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoBadge}>
          <span className="pink-neon-text">TEACHER</span> PORTAL | CRITIC
        </div>
        <button onClick={() => router.push('/')} className={styles.logoutBtn}>
          Exit Portal
        </button>
      </header>

      <main className={styles.mainContent}>
        <h1 className={styles.title}>TEACHER MANAGEMENT DASHBOARD</h1>
        <p className={styles.subtitle}>
          Generate access codes for students, monitor live investigation progress across stages, and add, edit, or remove topic sources.
        </p>

        {msg && <div className={styles.alertMsg}>{msg}</div>}

        <div className={styles.grid2Col}>
          {/* Access Code Generator Panel */}
          <section className="glass-card" style={{ padding: '28px' }}>
            <h2 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.2rem', marginBottom: '16px' }}>
              GENERATE ACCESS CODES
            </h2>

            <form onSubmit={handleGenerateCode} className={styles.codeForm}>
              <input
                type="text"
                placeholder="Custom Access Code (e.g. CLASS_A_2026)"
                value={customCodeInput}
                onChange={(e) => setCustomCodeInput(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className="btn-primary-cyan" style={{ width: '100%', marginTop: '12px' }}>
                GENERATE NEW CODE →
              </button>
            </form>

            <h4 style={{ fontFamily: 'var(--font-orbitron)', marginTop: '24px', marginBottom: '12px' }}>
              Active Student Codes ({accessCodes.length})
            </h4>
            <div className={styles.codesList}>
              {accessCodes.map((c) => (
                <div key={c.id} className={styles.codeItem}>
                  <code className={styles.codeText}>{c.code}</code>
                  <span className={styles.codeDate}>Created: {new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Source Management Panel */}
          <section className="glass-card" style={{ padding: '28px' }}>
            <h2 className="pink-neon-text" style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.2rem', marginBottom: '16px' }}>
              {editingSourceId ? 'EDIT TOPIC SOURCE' : 'ADD TOPIC SOURCE (CLIMATE CHANGE)'}
            </h2>

            <form onSubmit={handleSaveSource} className={styles.sourceForm}>
              <input
                type="text"
                placeholder="Source Title (e.g. IPCC Synthesis Report)"
                value={newSourceTitle}
                onChange={(e) => setNewSourceTitle(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Author / Institution Name"
                value={newSourceAuthor}
                onChange={(e) => setNewSourceAuthor(e.target.value)}
                className={styles.input}
                style={{ marginTop: '10px' }}
              />
              <textarea
                placeholder="Source Text Content..."
                value={newSourceText}
                onChange={(e) => setNewSourceText(e.target.value)}
                className={styles.textArea}
                style={{ marginTop: '10px', height: '110px' }}
                required
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="submit"
                  disabled={submittingSource}
                  className="btn-secondary-pink"
                  style={{ flex: 1 }}
                >
                  {submittingSource ? 'SAVING...' : editingSourceId ? 'UPDATE SOURCE →' : 'ADD SOURCE TO MODULE →'}
                </button>
                {editingSourceId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={styles.actionBtnSmall}
                    style={{ padding: '10px 16px' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <h4 style={{ fontFamily: 'var(--font-orbitron)', marginTop: '24px', marginBottom: '8px' }}>
              Active Module Sources ({sources.length})
            </h4>
            <div className={styles.sourceList}>
              {sources.map((s) => (
                <div key={s.id} className={styles.sourceCard}>
                  <div className={styles.sourceCardHeader}>
                    <div>
                      <h5 className={styles.sourceCardTitle}>{s.title}</h5>
                      <span className={styles.sourceMeta}>
                        {s.content.authorName ? `${s.content.authorName} • ` : ''}
                        Type: {s.content.type || 'article'}
                      </span>
                    </div>
                    <div className={styles.sourceActions}>
                      <button
                        onClick={() => handleStartEdit(s)}
                        className={styles.actionBtnSmall}
                        title="Edit this source"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSource(s.id)}
                        className={`${styles.actionBtnSmall} ${styles.actionBtnDelete}`}
                        title="Delete source"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  <p className={styles.sourceExcerpt}>{s.content.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Student Progress Overview Table */}
        <section className={styles.section} style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>STUDENT PROGRESS OVERVIEW</h2>
              <button
                onClick={fetchStudents}
                className="btn-primary-cyan"
                style={{ fontSize: '0.78rem', padding: '6px 16px' }}
                title="Refresh student progress"
              >
                ↻ REFRESH
              </button>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Auto-refreshes every 8 seconds
            </span>
          </div>

          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student ID / Code</th>
                  <th>Topic Module</th>
                  <th>Current Stage</th>
                  <th>Status</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>
                      No active students yet — students appear here live when they open any module stage.
                    </td>
                  </tr>
                ) : (
                  students.map((st) => (
                    <tr key={`${st.studentId}_${st.accessCode}`}>
                      <td>
                        <code className={styles.codeText}>{st.accessCode}</code>
                      </td>
                      <td>{st.topicTitle}</td>
                      <td>
                        <span className={styles.stageTag}>{formatStage(st.currentStage)}</span>
                      </td>
                      <td>
                        <span className={st.status === 'completed' ? styles.statusCompleted : styles.statusActive}>
                          {st.status === 'completed' ? '✓ COMPLETED' : '● IN PROGRESS'}
                        </span>
                      </td>
                      <td>{new Date(st.lastActive).toLocaleTimeString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

