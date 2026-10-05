'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

interface Topic {
  id: string;
  title: string;
  status: 'Available' | 'Coming Soon';
  description: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [enteringTopicId, setEnteringTopicId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/topics')
      .then((res) => res.json())
      .then((data) => {
        if (data.topics) setTopics(data.topics);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleEnterModule = (topicId: string) => {
    if (enteringTopicId) return;
    setEnteringTopicId(topicId);

    const moduleId = `mod_${topicId}_student_demo`;
    const savedStage = localStorage.getItem(`critic_current_stage_${topicId}`) || 'familiarise';
    
    // If student previously reached review/debrief, restart them at familiarise stage per user specification
    const targetStage = savedStage === 'review' ? 'familiarise' : savedStage;
    
    router.push(`/module/${moduleId}/${targetStage}`);
  };

  return (
    <div className={styles.container}>
      {/* Loading Overlay when Entering Module */}
      {enteringTopicId && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingGlowBox}>
            <div className={styles.spinnerLarge} />
            <h3 className={`cyan-neon-text ${styles.loadingOverlayTitle}`}>
              INITIALIZING CASEFILE MODULE...
            </h3>
            <p className={styles.loadingOverlaySub}>
              Loading evidence sources, syncing investigation notes & briefing Socratic Agent Aria.
            </p>
          </div>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.logoBadge}>
          <span className="cyan-neon-text">PROJECT</span> CRITIC
        </div>
        <button onClick={() => router.push('/')} className={styles.logoutBtn}>
          Exit Session
        </button>
      </header>

      <main className={styles.mainContent}>
        <h1 className={styles.heroTitle}>choose your topic</h1>
        <p className={styles.heroSubtitle}>think harder about what you read.</p>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>available topics</h2>
          <div className={styles.topicsGrid}>
            {loading ? (
              <div className={styles.loadingSpinner}>Loading topics...</div>
            ) : (
              topics.map((topic) => {
                const isAvailable = topic.status === 'Available';
                const isEntering = enteringTopicId === topic.id;

                return (
                  <div
                    key={topic.id}
                    className={`${styles.topicCard} ${
                      isAvailable ? styles.topicCardAvailable : styles.topicCardDisabled
                    }`}
                  >
                    <h3 className={styles.topicTitle}>{topic.title}</h3>
                    <p className={styles.topicDesc}>{topic.description}</p>

                    {isAvailable ? (
                      <button
                        onClick={() => handleEnterModule(topic.id)}
                        disabled={!!enteringTopicId}
                        className={`${styles.enterModuleBtn} ${isEntering ? styles.enterModuleBtnLoading : ''}`}
                      >
                        {isEntering ? (
                          <>
                            <span className={styles.spinnerSmall} />
                            <span>ENTERING MODULE...</span>
                          </>
                        ) : (
                          'enter module'
                        )}
                      </button>
                    ) : (
                      <span className={styles.comingSoonBadge}>coming soon</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>your journey</h2>
          <div className="glass-card" style={{ padding: '24px 32px' }}>
            <div className={styles.journeyGrid}>
              <div className={styles.journeyItem}>
                <span className={styles.stageNumber}>01</span>
                <h4 className={styles.stageTitle}>familiarise</h4>
                <p className={styles.stageDesc}>find assumptions and biases</p>
              </div>
              <div className={styles.journeyItem}>
                <span className={styles.stageNumber}>02</span>
                <h4 className={styles.stageTitle}>conceptualise</h4>
                <p className={styles.stageDesc}>identify and organise key concepts</p>
              </div>
              <div className={styles.journeyItem}>
                <span className={styles.stageNumber}>03</span>
                <h4 className={styles.stageTitle}>inquire</h4>
                <p className={styles.stageDesc}>challenge the material</p>
              </div>
              <div className={styles.journeyItem}>
                <span className={styles.stageNumber}>04</span>
                <h4 className={styles.stageTitle}>evaluate</h4>
                <p className={styles.stageDesc}>find evidence. assess credibility</p>
              </div>
              <div className={styles.journeyItem}>
                <span className={styles.stageNumber}>05</span>
                <h4 className={styles.stageTitle}>synthesise</h4>
                <p className={styles.stageDesc}>reflect and make a conclusion</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
