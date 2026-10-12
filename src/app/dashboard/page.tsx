'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import { RobotAvatar, RobotVariant } from '@/shared/components/RobotAvatar/RobotAvatar';

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

  // Customise Agent Modal State
  const [isCustomiseModalOpen, setIsCustomiseModalOpen] = useState(false);
  const [customiseTab, setCustomiseTab] = useState<'appearance' | 'tone'>('appearance');
  const [selectedAppearance, setSelectedAppearance] = useState<RobotVariant>('aria');
  const [selectedTone, setSelectedTone] = useState<string>('Socratic Peer');

  useEffect(() => {
    fetch('/api/topics')
      .then((res) => res.json())
      .then((data) => {
        if (data.topics) setTopics(data.topics);
      })
      .finally(() => setLoading(false));

    // Hydrate student preferences if present
    try {
      const stored = localStorage.getItem('critic_agent_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.appearance) setSelectedAppearance(parsed.appearance);
        if (parsed.tone) setSelectedTone(parsed.tone);
      }
    } catch {
      // Ignored
    }
  }, []);

  const handleEnterModule = (topicId: string) => {
    if (enteringTopicId) return;
    setEnteringTopicId(topicId);

    // Use the logged-in student's actual ID for isolation
    let studentId = 'student_demo';
    try {
      const userStr = localStorage.getItem('critic_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        studentId = user.id || user.email || user.accessCode || 'student_demo';
      }
    } catch (e) {
      console.error('Could not read critic_user from localStorage', e);
    }

    const moduleId = `mod_${topicId}_${studentId}`;
    const stageKey = `critic_current_stage_${studentId}_${topicId}`;
    const savedStage =
      localStorage.getItem(stageKey) ||
      localStorage.getItem(`critic_current_stage_${topicId}`) ||
      'familiarise';

    // If student previously reached review/debrief, restart them at familiarise stage
    const targetStage = savedStage === 'review' ? 'familiarise' : savedStage;

    router.push(`/module/${moduleId}/${targetStage}`);
  };

  const handleSavePreferences = async (appearance: RobotVariant, tone: string) => {
    setSelectedAppearance(appearance);
    setSelectedTone(tone);

    try {
      localStorage.setItem(
        'critic_agent_preferences',
        JSON.stringify({ appearance, tone })
      );

      let studentId = 'student_demo';
      const userStr = localStorage.getItem('critic_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        studentId = user.id || user.email || user.accessCode || 'student_demo';
      }

      await fetch(`/api/students/${studentId}/agent-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPersonality: tone,
          agentAppearance: appearance,
          avatarName: 'Aria',
        }),
      });
    } catch (e) {
      console.error('Could not sync preferences', e);
    }
  };

  return (
    <div className={styles.container}>
      {/* Loading Overlay when Entering Module */}
      {enteringTopicId && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingGlowBox}>
            <div className={styles.spinnerLarge} />
            <h2 className={styles.loadingOverlayTitle}>
              INITIALIZING CASEFILE MODULE...
            </h2>
            <p className={styles.loadingOverlaySub}>
              Loading evidence sources, syncing investigation notes &amp; briefing Socratic Agent Aria.
            </p>
          </div>
        </div>
      )}

      {/* Top Header per screens_v2/dashboard.png */}
      <header className={styles.header}>
        <div className={styles.logoBadge} onClick={() => router.push('/')}>
          <span className={styles.logoCyanText}>Critic</span>
        </div>
        <button
          onClick={() => setIsCustomiseModalOpen(true)}
          className={styles.customiseAgentBtn}
        >
          Customise your agent
        </button>
      </header>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <h1 className={styles.heroTitle}>Think harder about what you read.</h1>
          <p className={styles.heroSubtitle}>
            Pick a topic to work through. Train your critical thinking.
          </p>
        </section>

        {/* Topic Selection Grid */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Choose a topic</h2>
          <div className={styles.topicsGrid}>
            {loading ? (
              <div style={{ color: 'var(--color-accent-cyan)' }}>Loading available topics...</div>
            ) : (
              topics.map((topic) => {
                const isAvailable = topic.status === 'Available';
                const isEntering = enteringTopicId === topic.id;

                // Format topic title cleanly
                const displayTitle =
                  topic.id === 'climate-change'
                    ? 'Climate Change'
                    : topic.id === 'vaccine-safety'
                    ? 'Vaccine Safety'
                    : topic.id === 'mental-wellbeing'
                    ? 'Mental Well-being'
                    : topic.title;

                const displayDesc =
                  topic.id === 'climate-change'
                    ? 'Examine sources relating to the climate'
                    : 'Module will be available soon.';

                return (
                  <div
                    key={topic.id}
                    className={`${styles.topicCard} ${
                      isAvailable ? styles.topicCardAvailable : styles.topicCardDisabled
                    }`}
                  >
                    <div>
                      <h3
                        className={`${styles.topicTitle} ${
                          !isAvailable ? styles.topicTitleDisabled : ''
                        }`}
                      >
                        {displayTitle}
                      </h3>
                      <p
                        className={`${styles.topicDesc} ${
                          !isAvailable ? styles.topicDescDisabled : ''
                        }`}
                      >
                        {displayDesc}
                      </p>
                    </div>

                    <div className={styles.cardFooter}>
                      {isAvailable ? (
                        <button
                          onClick={() => handleEnterModule(topic.id)}
                          disabled={!!enteringTopicId}
                          className={styles.enterModuleLink}
                        >
                          {isEntering ? (
                            <>
                              <span className={styles.spinnerSmall} />
                              <span>Entering Module...</span>
                            </>
                          ) : (
                            'Enter Module'
                          )}
                        </button>
                      ) : (
                        <span className={styles.comingSoonText}>Coming Soon</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* "Your thinking journey" Container per screens_v2/dashboard.png */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Your thinking journey</h2>
          <div className={styles.journeyContainer}>
            <div className={styles.journeyGrid}>
              {/* Step 01 */}
              <div className={styles.journeyStepWrapper}>
                <span className={styles.stageNumber}>01</span>
                <div className={styles.journeyStepCard}>
                  <h3 className={styles.stageTitle}>Annotate</h3>
                  <p className={styles.stageDesc}>Find assumptions and biases</p>
                </div>
              </div>

              {/* Step 02 */}
              <div className={styles.journeyStepWrapper}>
                <span className={styles.stageNumber}>02</span>
                <div className={styles.journeyStepCard}>
                  <h3 className={styles.stageTitle}>Mind Map</h3>
                  <p className={styles.stageDesc}>Identify and organise key concepts</p>
                </div>
              </div>

              {/* Step 03 */}
              <div className={styles.journeyStepWrapper}>
                <span className={styles.stageNumber}>03</span>
                <div className={styles.journeyStepCard}>
                  <h3 className={styles.stageTitle}>Challenge</h3>
                  <p className={styles.stageDesc}>
                    Challenge the material and yourself. Find evidence and assess credibility
                  </p>
                </div>
              </div>

              {/* Step 04 */}
              <div className={styles.journeyStepWrapper}>
                <span className={styles.stageNumber}>04</span>
                <div className={styles.journeyStepCard}>
                  <h3 className={styles.stageTitle}>Conclude</h3>
                  <p className={styles.stageDesc}>Reflect and make a conclusion</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Customise Agent Modal per screens_v2/customise.png */}
      {isCustomiseModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setIsCustomiseModalOpen(false)}
        >
          <div
            className={styles.customiseModalCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setIsCustomiseModalOpen(false)}
              className={styles.modalCloseBtn}
              aria-label="Close modal"
            >
              ✕
            </button>

            <h2 className={styles.customiseModalTitle}>Customise your agent.</h2>

            <div className={styles.customiseModalBody}>
              {/* Left Options Menu */}
              <div className={styles.optionsColumn}>
                <div className={styles.optionsLabel}>Options</div>
                <div className={styles.optionsList}>
                  <button
                    type="button"
                    onClick={() => setCustomiseTab('appearance')}
                    className={`${styles.optionPill} ${
                      customiseTab === 'appearance' ? styles.optionPillActive : ''
                    }`}
                  >
                    Appearance
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomiseTab('tone')}
                    className={`${styles.optionPill} ${
                      customiseTab === 'tone' ? styles.optionPillActive : ''
                    }`}
                  >
                    Tone
                  </button>
                </div>
              </div>

              {/* Right Display Area */}
              <div className={styles.displayContainer}>
                {customiseTab === 'appearance' ? (
                  <>
                    <div className={styles.avatarsRow}>
                      {/* Left: Yellow Robot */}
                      <div
                        className={styles.avatarSideItem}
                        onClick={() => handleSavePreferences('yellow', selectedTone)}
                        title="Select Yellow Robot"
                      >
                        <RobotAvatar size={64} variant="yellow" />
                      </div>

                      {/* Center: Aria Robot (Selected) */}
                      <div
                        className={styles.avatarCenterItem}
                        onClick={() => handleSavePreferences('aria', selectedTone)}
                        title="Select Aria"
                      >
                        <RobotAvatar size={105} variant={selectedAppearance} glow />
                      </div>

                      {/* Right: Blue Robot */}
                      <div
                        className={styles.avatarSideItem}
                        onClick={() => handleSavePreferences('blue', selectedTone)}
                        title="Select Blue Robot"
                      >
                        <RobotAvatar size={64} variant="blue" />
                      </div>
                    </div>

                    {/* Pagination Dots per screens_v2/customise.png */}
                    <div className={styles.dotsRow}>
                      <span className={styles.dotInactive} />
                      <span className={styles.dotInactive} />
                      <span className={styles.dotActive} />
                      <span className={styles.dotInactive} />
                      <span className={styles.dotInactive} />
                      <span className={styles.dotInactive} />
                      <span className={styles.dotInactive} />
                      <span className={styles.dotInactive} />
                      <span className={styles.dotInactive} />
                    </div>
                  </>
                ) : (
                  /* Tone Selection View */
                  <div className={styles.toneSelectionView}>
                    {[
                      {
                        name: 'Socratic Peer',
                        desc: 'Engages in cooperative peer dialogue and asks thought-provoking counter-questions.',
                      },
                      {
                        name: "Devil's Advocate",
                        desc: 'Challenges your assertions directly to test the robustness of your claims.',
                      },
                      {
                        name: 'Scaffolding Mentor',
                        desc: 'Provides structured guided prompts and supportive hints step by step.',
                      },
                    ].map((tone) => (
                      <div
                        key={tone.name}
                        onClick={() => handleSavePreferences(selectedAppearance, tone.name)}
                        className={`${styles.toneCard} ${
                          selectedTone === tone.name ? styles.toneCardActive : ''
                        }`}
                      >
                        <div className={styles.toneName}>{tone.name}</div>
                        <p className={styles.toneDesc}>{tone.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
