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

  const [loading, setLoading] = useState<boolean>(true);
  const [submittingSource, setSubmittingSource] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch Students & Access Codes
    fetch('/api/teachers/teacher-demo/students')
      .then((res) => res.json())
      .then((data) => {
        if (data.students) setStudents(data.students);
        if (data.accessCodes) setAccessCodes(data.accessCodes);
      });

    // 2. Fetch Sources for Climate Change topic
    fetch('/api/topics/climate-change/sources')
      .then((res) => res.json())
      .then((data) => {
        if (data.sources) setSources(data.sources);
      })
      .finally(() => setLoading(false));
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
        setMsg(`Generated access code: ${data.accessCode.code}`);
      }
    } catch (err) {
      setMsg('Failed to generate code.');
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceTitle || !newSourceText) return;

    setSubmittingSource(true);
    try {
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
    } catch (err) {
      setMsg('Error adding source.');
    } finally {
      setSubmittingSource(false);
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
          Generate access codes for students, monitor investigation progress across stages, and manage topic sources.
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
              Active Student Codes
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
              ADD TOPIC SOURCE (CLIMATE CHANGE)
            </h2>

            <form onSubmit={handleAddSource} className={styles.sourceForm}>
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
                style={{ marginTop: '10px' }}
                required
              />
              <button type="submit" className="btn-secondary-pink" style={{ width: '100%', marginTop: '12px' }}>
                ADD SOURCE TO MODULE →
              </button>
            </form>
          </section>
        </div>

        {/* Student Progress Overview Table */}
        <section className={styles.section} style={{ marginTop: '40px' }}>
          <h2 className={styles.sectionTitle}>STUDENT PROGRESS OVERVIEW</h2>
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
                {students.map((st) => (
                  <tr key={st.studentId}>
                    <td>
                      <code>{st.accessCode}</code>
                    </td>
                    <td>{st.topicTitle}</td>
                    <td>
                      <span className={styles.stageTag}>{st.currentStage}</span>
                    </td>
                    <td>
                      <span className={styles.statusActive}>{st.status}</span>
                    </td>
                    <td>{new Date(st.lastActive).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
