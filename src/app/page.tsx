'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LandingPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate access code');
      }

      // Store in localStorage for client state persistence
      localStorage.setItem('critic_token', data.token);
      localStorage.setItem('critic_user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: teacherEmail, password: teacherPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid teacher credentials');
      }

      localStorage.setItem('critic_token', data.token);
      localStorage.setItem('critic_user', JSON.stringify(data.user));

      router.push('/teacher');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoBadge}>
          <span className="cyan-neon-text">PROJECT</span> CRITIC
        </div>
        <button
          onClick={() => setIsTeacherModalOpen(true)}
          className={styles.teacherLoginBtn}
        >
          Teacher Portal
        </button>
      </header>

      <div className={styles.heroContent}>
        <div className={styles.badgeLabel}>SOCRATIC AI AGENT INVESTIGATION</div>
        <h1 className={styles.mainTitle}>
          DECODE TRUTH. <br />
          <span className="pink-neon-text">CHALLENGE ASSUMPTIONS.</span>
        </h1>
        <p className={styles.subtitle}>
          Step into the investigator&apos;s shoes. Gather evidence, map conceptual links, interrogate claims, and master critical thinking against a peer Socratic AI agent.
        </p>

        <form onSubmit={handleStudentLogin} className={styles.accessForm}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              placeholder="ENTER ACCESS CODE (e.g. CLIMATE2026)"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className={styles.codeInput}
              required
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-primary-cyan"
              disabled={loading}
            >
              {loading ? 'AUTHENTICATING...' : 'ENTER CASEFILE →'}
            </button>
          </div>

          {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}
        </form>

        <div className={styles.demoCodeHint}>
          Demo Student Access Code: <code className="cyan-neon-text">CLIMATE2026</code>
        </div>
      </div>

      {isTeacherModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className="glass-card-glow" style={{ padding: '32px', maxWidth: '440px', width: '90%' }}>
            <div className={styles.modalHeader}>
              <h2 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)' }}>TEACHER LOGIN</h2>
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTeacherLogin} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Teacher Email</label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="teacher@school.edu"
                  className={styles.modalInput}
                  required
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="••••••••"
                  className={styles.modalInput}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-secondary-pink"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'VERIFYING...' : 'LOGIN TO DASHBOARD'}
              </button>
              {errorMsg && <div className={styles.errorMessage} style={{ marginTop: '12px' }}>{errorMsg}</div>}
              <div className={styles.demoCodeHint} style={{ marginTop: '16px', textAlign: 'center' }}>
                Demo Credentials: <code>teacher@school.edu</code> / <code>TeacherPass2026!</code>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
