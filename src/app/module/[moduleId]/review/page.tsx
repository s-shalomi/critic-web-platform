'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './review.module.css';
import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';
import {
  RobotAvatar,
  getStoredAgentPreferences,
  DEFAULT_AGENT_PREFERENCES,
  ResolvedAgentPreferences,
} from '@/shared/components/RobotAvatar/RobotAvatar';

interface ReviewData {
  conceptsIdentified: number;
  assumptionsChallenged: number;
  questionsAsked: number;
  misinformationEvaluations: number;
  mbtiPersonalityTitle: string;
  mbtiPersonalitySummary: string;
}

export default function ModuleReviewPage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [agentPrefs, setAgentPrefs] = useState<ResolvedAgentPreferences>(DEFAULT_AGENT_PREFERENCES);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentPrefs = getStoredAgentPreferences();
    setAgentPrefs(currentPrefs);

    // 1. Report module completion to teacher portal
    reportStudentProgress('review', 'Climate Change', 'completed');

    const computeAndLoadStats = async () => {
      // Keys with student scoping and legacy fallbacks
      const canvasNodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
      const notesKey = getStudentStorageKey('critic_notes', moduleId);
      const chatKey = getStudentStorageKey('critic_chat', moduleId);
      const synthKey = getStudentStorageKey('critic_synthesis', moduleId);
      const hintsKey = getStudentStorageKey('critic_hints', moduleId);
      const reviewKey = getStudentStorageKey('critic_review', moduleId);

      // Check localStorage first
      let canvasNodes: any[] = [];
      const canvasNodesStr =
        localStorage.getItem(canvasNodesKey) ||
        localStorage.getItem(`critic_nodes_canvas_${moduleId}`);
      if (canvasNodesStr) {
        try {
          canvasNodes = JSON.parse(canvasNodesStr);
        } catch (e) {
          console.error(e);
        }
      }

      let notes: any[] = [];
      const notesStr =
        localStorage.getItem(notesKey) || localStorage.getItem(`critic_notes_${moduleId}`);
      if (notesStr) {
        try {
          notes = JSON.parse(notesStr);
        } catch (e) {
          console.error(e);
        }
      }

      let chatMsgs: any[] = [];
      const chatStr =
        localStorage.getItem(chatKey) || localStorage.getItem(`critic_chat_${moduleId}`);
      if (chatStr) {
        try {
          chatMsgs = JSON.parse(chatStr);
        } catch (e) {
          console.error(e);
        }
      }

      let synthText =
        localStorage.getItem(synthKey) ||
        localStorage.getItem(`critic_synthesis_${moduleId}`) ||
        '';

      const hintsCount = parseInt(
        localStorage.getItem(hintsKey) || localStorage.getItem(`critic_hints_${moduleId}`) || '0',
        10
      );

      // Server fallbacks if local storage is empty
      if (canvasNodes.length === 0) {
        try {
          const res = await fetch(`/api/modules/${moduleId}/conceptualise`);
          const data = await res.json();
          if (data.nodes && data.nodes.length > 0) canvasNodes = data.nodes;
        } catch (e) {
          console.error(e);
        }
      }

      if (notes.length === 0) {
        try {
          const res = await fetch(`/api/modules/${moduleId}/notes`);
          const data = await res.json();
          if (data.notes && data.notes.length > 0) notes = data.notes;
        } catch (e) {
          console.error(e);
        }
      }

      if (chatMsgs.length === 0) {
        try {
          const res = await fetch(`/api/modules/${moduleId}/inquire`);
          const data = await res.json();
          if (data.messages && data.messages.length > 0) chatMsgs = data.messages;
        } catch (e) {
          console.error(e);
        }
      }

      if (!synthText) {
        try {
          const res = await fetch(`/api/modules/${moduleId}/synthesis`);
          const data = await res.json();
          if (data.synthesisDraft) synthText = data.synthesisDraft;
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Accurate metric calculations
      const convertedNotesCount = notes.filter((n) => n.convertedToNode).length;
      const conceptsCount = Math.max(canvasNodes.length, convertedNotesCount);
      const notesCount = notes.length;

      const studentMsgs = chatMsgs.filter((m) => m.sender === 'student');
      const questionsInChat = studentMsgs.filter((m) => m.text && m.text.includes('?')).length;
      const chatTurnsCount = studentMsgs.length;
      const questionsAsked = Math.max(questionsInChat + hintsCount, chatTurnsCount);

      const devilsAdvocateTurns = chatMsgs.filter(
        (m) => m.messageType === 'devils_advocate' || m.mode === 'DevilsAdvocate'
      ).length;
      const misinfoSourceNotes = notes.filter(
        (n) =>
          n.sourceId === 'source-1' ||
          (n.highlightedText && n.highlightedText.toLowerCase().includes('global warming'))
      ).length;
      const devilsAdvocateCount = Math.max(devilsAdvocateTurns, misinfoSourceNotes);

      const synthesisLength = synthText ? synthText.length : 0;

      // 3. Generate AI-evaluated review with computed metrics & full student artefacts
      try {
        const res = await fetch(`/api/modules/${moduleId}/review/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conceptsCount,
            notesCount,
            chatTurnsCount: questionsAsked,
            devilsAdvocateCount,
            synthesisLength,
            notes: notes.map((n: any) => ({
              highlightedText: String(n.highlightedText || ''),
              noteText: String(n.noteText || ''),
            })),
            conceptNodes: canvasNodes.map((n: any) => ({ text: String(n.text || '') })),
            chatMessages: chatMsgs.map((m: any) => ({
              sender: String(m.sender || ''),
              text: String(m.text || ''),
            })),
            synthesisText: synthText,
            agentPersonality: `${currentPrefs.toneName} (${currentPrefs.toneDesc})`,
            avatarName: currentPrefs.avatarName,
          }),
        });

        const data = await res.json();
        if (data.review) {
          setReview(data.review);
          localStorage.setItem(reviewKey, JSON.stringify(data.review));
        }
      } catch (err) {
        console.error('Error generating review:', err);
        const savedReviewStr = localStorage.getItem(reviewKey);
        if (savedReviewStr) {
          try {
            setReview(JSON.parse(savedReviewStr));
          } catch (e) {
            // ignore
          }
        }
      } finally {
        setLoading(false);
      }
    };

    computeAndLoadStats();
  }, [moduleId]);


  /**
   * Renders the MBTI Reasoning Profile card to an HTML5 Canvas and downloads as reasoning_profile_card.png
   */
  const handleDownloadCardImage = () => {
    if (!review) return;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 460;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 800, 460);
    gradient.addColorStop(0, '#0F172E');
    gradient.addColorStop(1, '#070B1A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 460);

    // Outer Glow Border
    ctx.strokeStyle = '#37F3FF';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 764, 424);

    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 24, 752, 412);

    // Header Label
    ctx.fillStyle = '#37F3FF';
    ctx.font = 'bold 14px "Space Grotesk", sans-serif';
    ctx.fillText('CRITIC | CRITICAL THINKING PROFILE CARD', 42, 58);

    // Personality Title
    ctx.fillStyle = '#EAF6FF';
    ctx.font = 'bold 26px "Space Grotesk", sans-serif';
    ctx.fillText(review.mbtiPersonalityTitle, 42, 98);

    // Line Divider
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
    ctx.beginPath();
    ctx.moveTo(42, 118);
    ctx.lineTo(758, 118);
    ctx.stroke();

    // Summary Text Wrapping
    ctx.fillStyle = '#D9DFF7';
    ctx.font = '16px "Exo 2", sans-serif';
    const words = review.mbtiPersonalitySummary.split(' ');
    let line = '';
    let y = 158;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 710 && i > 0) {
        ctx.fillText(line, 42, y);
        line = words[i] + ' ';
        y += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 42, y);

    // Stats Grid Footer
    y = 308;
    ctx.fillStyle = 'rgba(35, 43, 62, 0.92)';
    ctx.fillRect(42, y, 716, 70);
    ctx.strokeStyle = '#37F3FF';
    ctx.strokeRect(42, y, 716, 70);

    ctx.fillStyle = '#37F3FF';
    ctx.font = 'bold 14px "Space Grotesk", sans-serif';
    ctx.fillText(`CONCEPTS: ${review.conceptsIdentified}`, 58, y + 40);
    ctx.fillText(`ASSUMPTIONS: ${review.assumptionsChallenged}`, 215, y + 40);
    ctx.fillText(`QUESTIONS: ${review.questionsAsked}`, 410, y + 40);
    ctx.fillText(`MISINFO: ${review.misinformationEvaluations}`, 595, y + 40);

    // Signature & AI Disclosure
    ctx.fillStyle = 'rgba(217, 223, 247, 0.72)';
    ctx.font = '12px "Space Grotesk", sans-serif';
    ctx.fillText(
      `EVALUATED BY ${agentPrefs.avatarName.toUpperCase()} (${agentPrefs.toneName.toUpperCase()} TONE) • AI-GENERATED EDUCATIONAL REFLECTION`,
      42,
      416
    );

    // Export & Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'reasoning_profile_card.png';
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={styles.container}>
      {/* Top-Left Back Button matching screens_v2/review.png */}
      <header className={styles.topHeader}>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className={styles.dashboardBackBtn}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Dashboard</span>
        </button>
      </header>

      <main className={styles.mainContent}>
        {/* Hero Section matching screens_v2/review.png */}
        <section className={styles.heroSection}>
          <h1 className={styles.congratsTitle}>Congratulations</h1>
          <p className={styles.congratsSubtitle}>You completed the module!</p>
        </section>

        {loading || !review ? (
          <div className={styles.loadingCard}>
            <div className={styles.spinnerRing} />
            <p className={styles.loadingText}>
              {agentPrefs.avatarName} ({agentPrefs.toneName}) is calculating your critical thinking
              stats &amp; reasoning profile...
            </p>
          </div>
        ) : (
          <>
            {/* Core Inquiry Metric Stat Cards */}
            <section className={styles.metricsGrid} aria-label="Module performance statistics">
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>🧠</div>
                <span className={styles.metricVal}>{review.conceptsIdentified}</span>
                <span className={styles.metricLabel}>Concepts Identified</span>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>🛡️</div>
                <span className={styles.metricVal}>{review.assumptionsChallenged}</span>
                <span className={styles.metricLabel}>Assumptions Challenged</span>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>❓</div>
                <span className={styles.metricVal}>{review.questionsAsked}</span>
                <span className={styles.metricLabel}>Questions Asked</span>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>🔍</div>
                <span className={styles.metricVal}>{review.misinformationEvaluations}</span>
                <span className={styles.metricLabel}>Misinfo Critiques</span>
              </div>
            </section>

            {/* Shareable MBTI-like Personality Summary Card */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Your Critical Thinking Personality</h2>
              <div ref={cardRef} className={styles.profileCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardAgentBadgeRow}>
                    <RobotAvatar variant={agentPrefs.appearance} size={44} />
                    <div>
                      <span className={styles.cardBadge}>CRITIC REASONING PROFILE</span>
                      <h3 className={styles.cardPersonalityTitle}>{review.mbtiPersonalityTitle}</h3>
                    </div>
                  </div>
                </div>

                <p className={styles.cardSummaryBody}>{review.mbtiPersonalitySummary}</p>

                <div className={styles.cardFooter}>
                  <span className={styles.cardSignature}>
                    Evaluated by {agentPrefs.avatarName} • Tone: {agentPrefs.toneName}
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadCardImage}
                    className={styles.shareCardBtn}
                  >
                    Share Reasoning Card (Save PNG)
                  </button>
                </div>
              </div>

              {/* AI Generation Disclosure Disclaimer */}
              <div className={styles.aiDisclosureNote}>
                <span className={styles.disclosureIcon}>ℹ️</span>
                <p className={styles.aiDisclosureText}>
                  This critical thinking personality profile is AI-generated. Please do not take it too seriously.
                </p>
              </div>

              {/* Primary Dashboard Action Button */}
              <div className={styles.actionFooter}>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className={styles.returnDashboardBtn}
                >
                  <span>Return to Dashboard</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 5" />
                  </svg>
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
