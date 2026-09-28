'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './review.module.css';

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

  useEffect(() => {
    fetch(`/api/modules/${moduleId}/review/generate`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.review) {
          setReview(data.review);
        }
      })
      .finally(() => setLoading(false));
  }, [moduleId]);

  // Sequential Badge Unlock Animation effect
  useEffect(() => {
    if (!review || !review.badges) return;
    if (unlockedCount < review.badges.length) {
      const timer = setTimeout(() => {
        setUnlockedCount((prev) => prev + 1);
      }, 350); // 350ms delay per badge unlock
      return () => clearTimeout(timer);
    }
  }, [review, unlockedCount]);

  if (loading || !review) {
    return (
      <div className={styles.loadingContainer}>
        <div className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.4rem' }}>
          GENERATING CASEFILE ANALYTICS & REASONING BADGES...
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
          Here is your reasoning profile and performance analytics from the climate change module.
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
          <div className="glass-card-glow" style={{ padding: '36px', width: '100%', maxWidth: '780px', margin: '0 auto' }}>
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
                onClick={() => alert('Shareable Reasoning Card copied to clipboard!')}
                className="btn-primary-cyan"
              >
                SHARE REASONING CARD 🚀
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
