'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './login.module.css';
import { RobotAvatar } from '@/shared/components/RobotAvatar/RobotAvatar';

export default function StudentLoginPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
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

      localStorage.setItem('critic_token', data.token);
      localStorage.setItem('critic_user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAccessCode(text.trim());
      }
    } catch {
      // Clipboard access denied or unsupported
    }
  };

  return (
    <div className={styles.container}>
      {/* Background Dimmed Landing Mockup per screens_v2/login.png */}
      <div className={styles.backgroundCanvas}>
        <header className={styles.bgHeader}>
          <span className={styles.bgLogo}>Critic</span>
          <button className={styles.bgLoginBtn} disabled>Login</button>
        </header>
        <div className={styles.bgHero}>
          <div className={styles.bgEyebrow}>Critical Thinking, Improved</div>
          <div className={styles.bgTitle}>Think better with Critic.</div>
          <p className={styles.bgSubtitle}>
            Misinformation is becoming more and more prevalent. Social media, AI answers and even news
            articles need to be questioned. Critic gives you a place to slow down and really consider what’s
            being claimed and what you believe.
          </p>
        </div>
      </div>

      {/* Student Login Modal Dialog */}
      <div className={styles.modalBackdrop}>
        <div className={styles.studentModalCard} role="dialog" aria-modal="true">
          <Link href="/" className={styles.modalCloseBtn} aria-label="Return to landing page">
            ✕
          </Link>

          {/* Robot Badge */}
          <div className={styles.robotBadgeWrapper}>
            <RobotAvatar size={42} />
            <div className={styles.robotActivePip} />
          </div>

          <h1 className={styles.studentModalTitle}>Student Login</h1>
          <p className={styles.studentModalSubtitle}>
            Please enter the access code provided by your teacher
          </p>

          <form onSubmit={handleStudentLogin} className={styles.studentForm}>
            <div className={styles.inputMetaRow}>
              <span className={styles.inputMetaLabel}>ACCESS CODE</span>
              <span className={styles.inputMetaHint}>Any length • Case-insensitive</span>
            </div>

            <div className={styles.accessInputWrapper}>
              <input
                type="text"
                placeholder="e.g. CLIMATE-24"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className={styles.accessCodeInput}
                autoFocus
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={handlePasteCode}
                className={styles.pasteBtn}
                title="Paste from clipboard"
              >
                Paste
              </button>
            </div>

            {/* Quick Try Pills */}
            <div className={styles.quickTryRow}>
              <span className={styles.quickTryLabel}>Quick try:</span>
              <button
                type="button"
                onClick={() => setAccessCode('BIO')}
                className={styles.quickPillCyan}
              >
                &apos;BIO&apos;
              </button>
              <button
                type="button"
                onClick={() => setAccessCode('CLIMATE-2026')}
                className={styles.quickPillPurple}
              >
                &apos;CLIMATE-2026&apos;
              </button>
              <button
                type="button"
                onClick={() => setAccessCode('CLIMATE2026')}
                className={styles.quickPillCyan}
              >
                &apos;CLIMATE2026&apos;
              </button>
            </div>

            <button
              type="submit"
              className={styles.loginSubmitBtn}
              disabled={loading}
            >
              {loading ? 'AUTHENTICATING...' : (
                <>
                  LOGIN
                </>
              )}
            </button>

            {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}
