'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { RobotAvatar } from '@/shared/components/RobotAvatar/RobotAvatar';
import { CriticLogo } from '@/shared/components/CriticLogo/CriticLogo';

export default function LandingPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
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
      {/* Top Navigation Bar */}
      <header className={styles.header}>
        <CriticLogo href="/" />
        <button
          onClick={() => router.push('/login')}
          className={styles.loginPillBtn}
        >
          Login
        </button>
      </header>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.eyebrow}>Critical Thinking, Improved</div>
          <h1 className={styles.mainTitle}>
            Think better with <span className={styles.cyanHighlight}>Critic.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Misinformation is becoming more and more prevalent. Social media, AI answers and even news
            articles need to be questioned. Critic gives you a place to slow down and really consider what’s
            being claimed and what you believe.
          </p>
        </section>

        {/* Browser Mockup Window */}
        <section className={styles.browserMockup} aria-label="Critic Platform Preview">
          {/* Window Header */}
          <div className={styles.browserHeader}>
            <div className={styles.windowDots}>
              <div className={styles.dotRed} />
              <div className={styles.dotYellow} />
              <div className={styles.dotGreen} />
            </div>
            <div className={styles.browserUrl}>critic.app/climate_change</div>
          </div>

          {/* Window Mockup Body */}
          <div className={styles.mockupBody}>
            {/* Left Panel: Dialogue & Challenge */}
            <div className={styles.mockupLeftPanel}>
              <div className={styles.mockupBack}>← Climate Change</div>
              <h2 className={styles.mockupTitle}>Challenge Everything</h2>

              <div className={styles.agentBubbleRow}>
                <div className={styles.robotAvatarMock}>
                  <RobotAvatar size={26} />
                </div>
                <div className={styles.agentSpeech}>
                  What assumptions of your own are hiding behind these nodes?
                </div>
              </div>

              <div className={styles.userSpeechRow}>
                <div className={styles.userSpeech}>
                  I jumped to judge the author and immediately believed the post would be false.
                </div>
              </div>
            </div>

            {/* Right Panel: Concept Mind Map Canvas */}
            <div className={styles.mockupRightCanvas}>
              <div className={styles.canvasTopControls}>
                <div className={styles.tutorialPill}>
                  <span>▶</span> Tutorial
                </div>
                <div className={styles.helpCircle}>?</div>
              </div>

              <div className={styles.canvasDiagram}>
                {/* Connecting SVG Link */}
                <svg className={styles.connectingLineSvg}>
                  <defs>
                    <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <line
                    x1="48%"
                    y1="110"
                    x2="33%"
                    y2="230"
                    stroke="#37F3FF"
                    strokeWidth="2.5"
                    filter="url(#cyanGlow)"
                  />
                </svg>

                {/* Node 1 */}
                <div className={styles.nodeCold}>
                  <span>record</span>
                  <span>setting</span>
                  <span>cold</span>
                </div>

                {/* Node 2 */}
                <div className={styles.nodeWeather}>
                  <span>extreme</span>
                  <span>weather</span>
                </div>

                {/* Canvas Floating Tools */}
                <div className={styles.canvasRightToolbar}>
                  <span className={styles.toolIcon} title="Pan">✋</span>
                  <span className={styles.toolIcon} title="Node">⭕</span>
                  <span className={styles.toolIcon} title="Link">✏️</span>
                  <span className={styles.toolIcon} title="Text" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Tt</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* "How it works" Section per screens_v2/landing2.png */}
        <section className={styles.howItWorksSection}>
          <div className={styles.sectionEyebrow}>How it works</div>
          <h2 className={styles.sectionTitle}>Four stages backed by research</h2>
          <div className={styles.sectionSubtitleMain}>Work through real sources.</div>
          <div className={styles.sectionSubtitleSub}>Each stage builds on your work in the previous stage</div>

          {/* 4 Stage Cards Grid */}
          <div className={styles.stagesGrid}>
            {/* Card 01 */}
            <div className={styles.stageCard}>
              <div className={styles.cardTopRow}>
                <span className={`${styles.stageNum} ${styles.cyanHighlight}`}>01</span>
                <span className={`${styles.stageTagPill} ${styles.tagCyan}`}>SOURCE DECONSTRUCTION</span>
              </div>
              <div className={`${styles.cardIconBox} ${styles.cardIconCyan}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <h3 className={styles.cardTitle}>Read + Annotate</h3>
              <p className={styles.cardDescription}>
                <strong>Familiarise</strong> with raw source materials. Dissect tweet claims, synthesized search results, and press reports. Highlight verifiable facts versus emotive rhetoric.
              </p>
              <div className={styles.cardDivider} />
              <div className={styles.cardBullet}>
                <span className={`${styles.bulletDot}`} style={{ backgroundColor: '#37F3FF' }} />
                <span>Tag source bias &amp; author intent</span>
              </div>
            </div>

            {/* Card 02 */}
            <div className={styles.stageCard}>
              <div className={styles.cardTopRow}>
                <span className={styles.stageNum} style={{ color: '#A855F7' }}>02</span>
                <span className={`${styles.stageTagPill} ${styles.tagPurple}`}>COGNITIVE MAPPING</span>
              </div>
              <div className={`${styles.cardIconBox} ${styles.cardIconPurple}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h3 className={styles.cardTitle}>Mind Map</h3>
              <p className={styles.cardDescription}>
                <strong>Conceptualise</strong> claims by converting fragmented notes into spatial graphs. Connect causes, consequences, and fallacies with visual dynamic bezier links.
              </p>
              <div className={styles.cardDivider} />
              <div className={styles.cardBullet}>
                <span className={`${styles.bulletDot}`} style={{ backgroundColor: '#A855F7' }} />
                <span>Expose missing evidence leaps</span>
              </div>
            </div>

            {/* Card 03 */}
            <div className={styles.stageCard}>
              <div className={styles.cardTopRow}>
                <span className={styles.stageNum} style={{ color: '#F59E0B' }}>03</span>
                <span className={`${styles.stageTagPill} ${styles.tagAmber}`}>SOCRATIC DEBATE</span>
              </div>
              <div className={`${styles.cardIconBox} ${styles.cardIconAmber}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className={styles.cardTitle}>Challenge</h3>
              <p className={styles.cardDescription}>
                <strong>Inquire + Evaluate</strong> with an AI adversary. The robot agent probes assumptions, injects counter-factuals, and pressures students to defend their chain of reasoning.
              </p>
              <div className={styles.cardDivider} />
              <div className={styles.cardBullet}>
                <span className={`${styles.bulletDot}`} style={{ backgroundColor: '#F59E0B' }} />
                <span>Stress-test arguments safely</span>
              </div>
            </div>

            {/* Card 04 */}
            <div className={styles.stageCard}>
              <div className={styles.cardTopRow}>
                <span className={styles.stageNum} style={{ color: '#10B981' }}>04</span>
                <span className={`${styles.stageTagPill} ${styles.tagEmerald}`}>METACOGNITION</span>
              </div>
              <div className={`${styles.cardIconBox} ${styles.cardIconEmerald}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className={styles.cardTitle}>Conclude</h3>
              <p className={styles.cardDescription}>
                <strong>Synthesise</strong> findings into verified verdicts. Export audit-ready briefs with citations, confidence scores, and structured rationale for teachers or peers.
              </p>
              <div className={styles.cardDivider} />
              <div className={styles.cardBullet}>
                <span className={`${styles.bulletDot}`} style={{ backgroundColor: '#10B981' }} />
                <span>Generate citation-backed report</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <section className={styles.bottomCtaSection}>
          <h2 className={styles.ctaTitle}>Ready to get started?</h2>
          <p className={styles.ctaSubtitle}>
            Train your critical thinking and challenge misinformation through evidence-based Socratic inquiry.
          </p>
          <button
            onClick={() => router.push('/login')}
            className={styles.primaryCtaBtn}
          >
            Start with Access Code →
          </button>
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsTeacherModalOpen(true);
            }}
            className={styles.educatorLink}
          >
            Educator portal access →
          </button>
        </section>
      </div>

      {/* Student Login Modal per screens_v2/login.png */}
      {isStudentModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsStudentModalOpen(false)}>
          <div
            className={styles.studentModalCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setIsStudentModalOpen(false)}
              className={styles.modalCloseBtn}
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Robot Badge */}
            <div className={styles.robotBadgeWrapper}>
              <RobotAvatar size={42} />
              <div className={styles.robotActivePip} />
            </div>

            <h2 className={styles.studentModalTitle}>Student Login</h2>
            <p className={styles.studentModalSubtitle}>
              Please enter the access code provided by your teacher
            </p>

            <form onSubmit={handleStudentLogin} className={styles.studentForm}>
              <div className={styles.inputMetaRow}>
                <span className={styles.inputMetaLabel}>ACCESS CODE</span>
                <span className={styles.inputMetaHint}>Case-insensitive</span>
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
                    LOGIN <span>→</span>
                  </>
                )}
              </button>

              {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}
            </form>
          </div>
        </div>
      )}

      {/* Teacher Login Modal (Accessed via teacher-only educator link) */}
      {isTeacherModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsTeacherModalOpen(false)}>
          <div
            className={styles.teacherModalCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setIsTeacherModalOpen(false)}
              className={styles.modalCloseBtn}
              aria-label="Close modal"
            >
              ✕
            </button>

            <h2 className={styles.teacherModalTitle}>Teacher Portal</h2>
            <p className={styles.teacherModalSubtitle}>
              Sign in to manage curriculum sources and monitor student progress
            </p>

            <form onSubmit={handleTeacherLogin}>
              <div className={styles.teacherInputGroup}>
                <label className={styles.teacherLabel}>Teacher Email</label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="teacher@school.edu"
                  className={styles.teacherInput}
                  required
                />
              </div>

              <div className={styles.teacherInputGroup}>
                <label className={styles.teacherLabel}>Password</label>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="••••••••"
                  className={styles.teacherInput}
                  required
                />
              </div>

              <button
                type="submit"
                className={styles.teacherSubmitBtn}
                disabled={loading}
              >
                {loading ? 'VERIFYING...' : 'LOGIN TO TEACHER DASHBOARD'}
              </button>

              {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}

              <div className={styles.teacherDemoHint}>
                Demo Credentials: <code>teacher@school.edu</code> / <code>TeacherPass2026!</code>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
