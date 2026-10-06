'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './review.module.css';
import { getStudentStorageKey } from '@/shared/utils/storage';

import { reportStudentProgress } from '@/shared/utils/reportProgress';

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface ReviewData {
  conceptsIdentified: number;
  assumptionsChallenged: number;
  questionsAsked: number;
  misinformationEvaluations: number;
  criticalThinkingScore: number;
  synthesisScore: number;
  mbtiPersonalityTitle: string;
  mbtiPersonalitySummary: string;
  badges: Badge[];
}

export default function ModuleReviewPage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [review, setReview] = useState<ReviewData | null>(null);
  const [unlockedCount, setUnlockedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

      // Check if review was already saved locally
      const savedReviewStr = localStorage.getItem(reviewKey);
      if (savedReviewStr) {
        try {
          const parsed = JSON.parse(savedReviewStr);
          if (parsed && parsed.conceptsIdentified !== undefined) {
            setReview(parsed);
            setLoading(false);
          }
        } catch (e) {
          console.error('Error parsing saved review:', e);
        }
      }

      // Check localStorage first
      let canvasNodes: any[] = [];
      const canvasNodesStr = localStorage.getItem(canvasNodesKey) || localStorage.getItem(`critic_nodes_canvas_${moduleId}`);
      if (canvasNodesStr) {
        try { canvasNodes = JSON.parse(canvasNodesStr); } catch (e) { console.error(e); }
      }

      let notes: any[] = [];
      const notesStr = localStorage.getItem(notesKey) || localStorage.getItem(`critic_notes_${moduleId}`);
      if (notesStr) {
        try { notes = JSON.parse(notesStr); } catch (e) { console.error(e); }
      }

      let chatMsgs: any[] = [];
      const chatStr = localStorage.getItem(chatKey) || localStorage.getItem(`critic_chat_${moduleId}`);
      if (chatStr) {
        try { chatMsgs = JSON.parse(chatStr); } catch (e) { console.error(e); }
      }

      let synthText = localStorage.getItem(synthKey) || localStorage.getItem(`critic_synthesis_${moduleId}`) || '';

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
        } catch (e) { console.error(e); }
      }

      if (notes.length === 0) {
        try {
          const res = await fetch(`/api/modules/${moduleId}/notes`);
          const data = await res.json();
          if (data.notes && data.notes.length > 0) notes = data.notes;
        } catch (e) { console.error(e); }
      }

      if (chatMsgs.length === 0) {
        try {
          const res = await fetch(`/api/modules/${moduleId}/inquire`);
          const data = await res.json();
          if (data.messages && data.messages.length > 0) chatMsgs = data.messages;
        } catch (e) { console.error(e); }
      }

      if (!synthText) {
        try {
          const res = await fetch(`/api/modules/${moduleId}/synthesis`);
          const data = await res.json();
          if (data.synthesisDraft) synthText = data.synthesisDraft;
        } catch (e) { console.error(e); }
      }

      // 2. Accurate metric calculations
      // Concepts Identified: canvas nodes + any notes converted to node
      const convertedNotesCount = notes.filter((n) => n.convertedToNode).length;
      const conceptsCount = Math.max(canvasNodes.length, convertedNotesCount);

      // Assumptions Challenged: notes taken (which deconstruct biases and implicit assumptions) + chat turns
      const notesCount = notes.length;

      // Questions Asked: student messages with '?' or student inquiry turns + avatar hints requested
      const studentMsgs = chatMsgs.filter((m) => m.sender === 'student');
      const questionsInChat = studentMsgs.filter((m) => m.text && m.text.includes('?')).length;
      const chatTurnsCount = studentMsgs.length;
      const questionsAsked = Math.max(questionsInChat + hintsCount, chatTurnsCount);

      // Misinformation Evaluations: Devil's Advocate messages critiqued + notes evaluating misinformation source 1
      const devilsAdvocateTurns = chatMsgs.filter(
        (m) => m.messageType === 'devils_advocate' || m.mode === 'DevilsAdvocate'
      ).length;
      const misinfoSourceNotes = notes.filter(
        (n) => n.sourceId === 'source-1' || (n.highlightedText && n.highlightedText.toLowerCase().includes('global warming'))
      ).length;
      const devilsAdvocateCount = Math.max(devilsAdvocateTurns, misinfoSourceNotes);

      const synthesisLength = synthText ? synthText.length : 0;

      // 3. Generate review with computed accurate metrics
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
          }),
        });

        const data = await res.json();
        if (data.review) {
          setReview(data.review);
          localStorage.setItem(reviewKey, JSON.stringify(data.review));
        }
      } catch (err) {
        console.error('Error generating review:', err);
      } finally {
        setLoading(false);
      }
    };

    computeAndLoadStats();
  }, [moduleId]);

  // Sequential Badge Unlock Animation effect
  useEffect(() => {
    if (!review || !review.badges) return;
    if (unlockedCount < review.badges.length) {
      const timer = setTimeout(() => {
        setUnlockedCount((prev) => prev + 1);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [review, unlockedCount]);

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

    // Outer Neon Glow Border
    ctx.strokeStyle = '#37F3FF';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 768, 428);

    ctx.strokeStyle = '#FF4FD8';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, 756, 416);

    // Header Label
    ctx.fillStyle = '#37F3FF';
    ctx.font = 'bold 14px "Space Mono", monospace';
    ctx.fillText('PROJECT CRITIC | REASONING PROFILE CARD', 40, 56);

    // Personality Title
    ctx.fillStyle = '#FF4FD8';
    ctx.font = 'bold 26px "Orbitron", sans-serif';
    ctx.fillText(review.mbtiPersonalityTitle, 40, 100);

    // Line Divider
    ctx.strokeStyle = 'rgba(68, 81, 104, 0.5)';
    ctx.beginPath();
    ctx.moveTo(40, 120);
    ctx.lineTo(760, 120);
    ctx.stroke();

    // Summary Text Wrapping
    ctx.fillStyle = '#EAF6FF';
    ctx.font = '16px "Exo 2", sans-serif';
    const words = review.mbtiPersonalitySummary.split(' ');
    let line = '';
    let y = 160;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 710 && i > 0) {
        ctx.fillText(line, 40, y);
        line = words[i] + ' ';
        y += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 40, y);

    // Stats Grid Footer
    y = 310;
    ctx.fillStyle = 'rgba(15, 23, 46, 0.9)';
    ctx.fillRect(40, y, 720, 70);
    ctx.strokeStyle = '#37F3FF';
    ctx.strokeRect(40, y, 720, 70);

    ctx.fillStyle = '#37F3FF';
    ctx.font = 'bold 13px "Orbitron", sans-serif';
    ctx.fillText(`CONCEPTS: ${review.conceptsIdentified}`, 60, y + 40);
    ctx.fillText(`ASSUMPTIONS: ${review.assumptionsChallenged}`, 220, y + 40);
    ctx.fillText(`QUESTIONS: ${review.questionsAsked}`, 410, y + 40);

    ctx.fillStyle = '#FF4FD8';
    ctx.fillText(`CRITICAL SCORE: ${review.criticalThinkingScore}/100`, 560, y + 40);

    // Signature
    ctx.fillStyle = 'rgba(234, 246, 255, 0.5)';
    ctx.font = '12px "Space Mono", monospace';
    ctx.fillText('VERIFIED BY ARIA (SOCRATIC AGENT)', 40, 420);

    // Export & Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'reasoning_profile_card.png';
    link.href = dataUrl;
    link.click();
  };

  if (loading || !review) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner" style={{ marginBottom: '1.5rem' }} />
        <div className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.4rem' }}>
          CALCULATING REASONING ANALYTICS &amp; REASONING BADGES...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoBadge}>
          <span className="cyan-neon-text">PROJECT</span> CRITIC | CASE DEBRIEF
        </div>
        <button onClick={() => router.push('/dashboard')} className={styles.dashboardBtn}>
          Return to Topics Dashboard →
        </button>
      </header>

      <main className={styles.mainContent}>
        <h1 className={styles.pageTitle}>CASEFILE INVESTIGATION COMPLETE</h1>
        <p className={styles.pageSubtitle}>
          Here is your accurate reasoning profile and performance analytics computed from your active module session.
        </p>

        {/* 6 Core Metric Stat Cards */}
        <section className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricVal}>{review.conceptsIdentified}</span>
            <span className={styles.metricLabel}>Concepts Identified</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricVal}>{review.assumptionsChallenged}</span>
            <span className={styles.metricLabel}>Assumptions Challenged</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricVal}>{review.questionsAsked}</span>
            <span className={styles.metricLabel}>Questions Asked</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricVal}>{review.misinformationEvaluations}</span>
            <span className={styles.metricLabel}>Misinfo Critiques</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricVal} style={{ color: 'var(--color-accent-pink)' }}>
              {review.criticalThinkingScore}/100
            </span>
            <span className={styles.metricLabel}>Critical Thinking Score</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricVal} style={{ color: 'var(--color-accent-cyan)' }}>
              {review.synthesisScore}/100
            </span>
            <span className={styles.metricLabel}>Synthesis Quality</span>
          </div>
        </section>

        {/* Sequential Badge Unlock Animation Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>UNLOCKED REASONING BADGES</h2>
          <div className={styles.badgesGrid}>
            {review.badges.map((badge, idx) => {
              const isUnlocked = idx < unlockedCount;
              return (
                <div
                  key={badge.id}
                  className={`${styles.badgeCard} ${
                    isUnlocked ? styles.badgeUnlocked : styles.badgeLocked
                  }`}
                >
                  <div className={styles.badgeIcon}>{badge.icon}</div>
                  <h4 className={styles.badgeTitle}>{badge.title}</h4>
                  <p className={styles.badgeDesc}>{badge.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* MBTI-like Reasoning Personality Summary Card */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>REASONING PROFILE CARD</h2>
          <div ref={cardRef} className="glass-card-glow" style={{ padding: '36px', width: '100%', maxWidth: '780px', margin: '0 auto' }}>
            <div className={styles.cardHeader}>
              <span className={styles.cardBadge}>CRITIC REASONING TYPE</span>
              <h3 className="pink-neon-text" style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.8rem', marginTop: '8px' }}>
                {review.mbtiPersonalityTitle}
              </h3>
            </div>
            <p className={styles.cardSummaryBody}>{review.mbtiPersonalitySummary}</p>

            <div className={styles.cardFooter}>
              <span className={styles.cardSignature}>VERIFIED BY ARIA (SOCRATIC AGENT)</span>
              <button
                onClick={handleDownloadCardImage}
                className="btn-primary-cyan"
              >
                SHARE REASONING CARD (SAVE IMAGE) 🖼️
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
