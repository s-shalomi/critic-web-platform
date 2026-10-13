'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import {
  AVATAR_OPTIONS,
  RobotAvatar,
  RobotVariant,
} from '@/shared/components/RobotAvatar/RobotAvatar';
import { CriticLogo } from '@/shared/components/CriticLogo/CriticLogo';

interface Topic {
  id: string;
  title: string;
  status: 'Available' | 'Coming Soon';
  description: string;
}

const TONE_OPTIONS = [
  {
    name: 'Friendly',
    desc: 'Encouraging, warm, and highly engaging without being overly corporate. Uses natural Gen Z phrasing, light humor, and supportive language.',
  },
  {
    name: 'Mentor',
    desc: 'Relatable, calm, and non-judgmental. They ask probing questions that encourage deeper thought and self-discovery.',
  },
  {
    name: 'Witty Challenger',
    desc: 'Playful, sharp, and strategic. Uses wit, light roasts, and clever provocations to sharpen thinking.',
  },
  {
    name: 'Curious Explorer',
    desc: "Gentle and curious. They show interest in the user's ideas and offer encouragement.",
  },
  {
    name: "Devil's Advocate",
    desc: 'Challenges assumptions and beliefs, pushing the user to consider alternative perspectives.',
  },
];

const JOURNEY_STAGES = [
  {
    num: '01',
    title: 'Annotate',
    desc: 'Find assumptions and biases. Highlight rhetorical techniques, source motivations, and unproven claims.',
    stageName: 'Familiarise',
    stepLabel: 'Step 1',
    color: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.25)',
  },
  {
    num: '02',
    title: 'Mind Map',
    desc: 'Identify and organise key concepts. Build visual node webs linking claims, evidence, and logical leaps.',
    stageName: 'Conceptualise',
    stepLabel: 'Step 2',
    color: '#C084FC',
    glow: 'rgba(192, 132, 252, 0.25)',
  },
  {
    num: '03',
    title: 'Challenge',
    desc: 'Challenge the material and yourself. Converse with the AI agent to stress-test your perspective and discover blind spots.',
    stageName: 'Inquire + Evaluate',
    stepLabel: 'Step 3',
    color: '#818CF8',
    glow: 'rgba(129, 140, 248, 0.25)',
  },
  {
    num: '04',
    title: 'Conclude',
    desc: 'Reflect and make a reasoned conclusion. Synthesise your annotations and map into a finalized position.',
    stageName: 'Synthesise',
    stepLabel: 'Step 4',
    color: '#37F3FF',
    glow: 'rgba(55, 243, 255, 0.25)',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [enteringTopicId, setEnteringTopicId] = useState<string | null>(null);

  // Customise Agent Modal State
  const [isCustomiseModalOpen, setIsCustomiseModalOpen] = useState(false);
  const [customiseTab, setCustomiseTab] = useState<'appearance' | 'tone'>('appearance');
  const [selectedAppearance, setSelectedAppearance] = useState<RobotVariant>('aria');
  const [selectedTone, setSelectedTone] = useState<string>('Friendly');

  // Infinite Circular Carousel Interaction State
  const lastWheelTimeRef = useRef<number>(0);
  const dragStartXRef = useRef<number | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState<number>(0);

  const activeAvatarIndex = Math.max(
    0,
    AVATAR_OPTIONS.findIndex((a) => a.id === selectedAppearance)
  );

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
        if (parsed.appearance && AVATAR_OPTIONS.some((a) => a.id === parsed.appearance)) {
          setSelectedAppearance(parsed.appearance);
        }
        if (parsed.tone && TONE_OPTIONS.some((t) => t.name === parsed.tone)) {
          setSelectedTone(parsed.tone);
        }
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

    const avatarMeta = AVATAR_OPTIONS.find((a) => a.id === appearance);
    const avatarName = avatarMeta ? avatarMeta.name : 'Aria';

    try {
      localStorage.setItem(
        'critic_agent_preferences',
        JSON.stringify({ appearance, tone, avatarName })
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
          avatarName,
        }),
      });
    } catch (e) {
      console.error('Could not sync preferences', e);
    }
  };

  const shiftCarousel = (delta: number) => {
    const total = AVATAR_OPTIONS.length;
    const nextIndex = (((activeAvatarIndex + delta) % total) + total) % total;
    handleSavePreferences(AVATAR_OPTIONS[nextIndex].id, selectedTone);
  };

  const handleCarouselWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 200) return;
    const primaryDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(primaryDelta) < 8) return;

    lastWheelTimeRef.current = now;
    if (primaryDelta > 0) {
      shiftCarousel(1);
    } else {
      shiftCarousel(-1);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartXRef.current = e.clientX;
    setDragOffsetX(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartXRef.current === null) return;
    setDragOffsetX(e.clientX - dragStartXRef.current);
  };

  const handlePointerUp = () => {
    if (dragStartXRef.current === null) return;
    if (dragOffsetX < -35) {
      shiftCarousel(1);
    } else if (dragOffsetX > 35) {
      shiftCarousel(-1);
    }
    dragStartXRef.current = null;
    setDragOffsetX(0);
  };

  useEffect(() => {
    if (!isCustomiseModalOpen || customiseTab !== 'appearance') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        shiftCarousel(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        shiftCarousel(-1);
      } else if (e.key === 'Escape') {
        setIsCustomiseModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCustomiseModalOpen, customiseTab, activeAvatarIndex, selectedTone]);

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
        <CriticLogo href="/dashboard" />
        <button
          onClick={() => setIsCustomiseModalOpen(true)}
          className={styles.customiseAgentBtn}
          aria-label="Customise your agent"
        >
          <span className={styles.customiseAvatarBadge}>
            <RobotAvatar variant={selectedAppearance} size={22} />
          </span>
          <span className={styles.customiseBtnText}>Customise your agent</span>
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
                    onClick={isAvailable ? () => handleEnterModule(topic.id) : undefined}
                    role={isAvailable ? 'button' : undefined}
                    tabIndex={isAvailable ? 0 : undefined}
                    onKeyDown={
                      isAvailable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleEnterModule(topic.id);
                            }
                          }
                        : undefined
                    }
                    aria-label={isAvailable ? `Enter ${displayTitle} module` : undefined}
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
                        <div className={styles.enterModuleLink}>
                          {isEntering ? (
                            <>
                              <span className={styles.spinnerSmall} />
                              <span>Entering Module...</span>
                            </>
                          ) : (
                            <>
                              <span>Enter Module</span>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </>
                          )}
                        </div>
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
        <section className={`${styles.section} ${styles.journeySection}`}>
          <h2 className={styles.sectionHeading}>Your thinking journey</h2>
          <p className={styles.journeySubtitle}>
            An iterative process. Move between stages freely as your thinking evolves. Select a module above to begin.
          </p>

          <div className={styles.journeyContainer}>
            <div className={styles.journeyGrid}>
              {JOURNEY_STAGES.map((stage, idx) => (
                <div key={stage.num} className={styles.stageColumn}>
                  {/* Non-linear bidirectional connector & milestone node */}
                  <div className={styles.stagePathHeader}>
                    <div
                      className={styles.stageNode}
                      style={{
                        borderColor: stage.color,
                        color: stage.color,
                        boxShadow: `0 0 14px ${stage.glow}`,
                      }}
                    >
                      <span>{stage.num}</span>
                    </div>

                    {idx < JOURNEY_STAGES.length - 1 && (
                      <div className={styles.pathwayTrack} aria-hidden="true">
                        <div className={styles.pathwayArrowLeft}>
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="15 18 9 12 15 6" />
                          </svg>
                        </div>
                        <div className={styles.pathwayLine} />
                        <div className={styles.pathwayArrowRight}>
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage Card matching user uploaded reference */}
                  <div className={styles.journeyCard}>
                    <div className={styles.cardContent}>
                      <h3 className={styles.cardTitle}>{stage.title}</h3>
                      <p className={styles.cardDescription}>{stage.desc}</p>
                    </div>

                    <div className={styles.cardFooter}>
                      <span className={styles.cardStageName} style={{ color: stage.color }}>
                        {stage.stageName}
                      </span>
                      <span className={styles.cardStepLabel}>{stage.stepLabel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Customise Agent Modal per screens_v2/customise.png & Section 9 */}
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
            aria-labelledby="customise-agent-title"
          >
            <button
              onClick={() => setIsCustomiseModalOpen(false)}
              className={styles.modalCloseBtn}
              aria-label="Close modal"
            >
              ✕
            </button>

            <h2 id="customise-agent-title" className={styles.customiseModalTitle}>
              Customise your agent.
            </h2>

            <div className={styles.customiseModalBody}>
              {/* Left Options Menu Box */}
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

              {/* Right Display Area Box */}
              <div className={styles.displayContainer}>
                {customiseTab === 'appearance' ? (
                  <>
                    <div
                      className={styles.carouselViewport}
                      onWheel={handleCarouselWheel}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      role="region"
                      aria-label="Infinite circular avatar carousel"
                    >
                      <button
                        type="button"
                        className={`${styles.carouselNavBtn} ${styles.carouselNavPrev}`}
                        onClick={() => shiftCarousel(-1)}
                        aria-label="Previous avatar"
                      >
                        ‹
                      </button>

                      <div className={styles.carouselTrack}>
                        {AVATAR_OPTIONS.map((avatar, idx) => {
                          const total = AVATAR_OPTIONS.length;
                          let offset = idx - activeAvatarIndex;
                          if (offset > Math.floor(total / 2)) offset -= total;
                          if (offset < -Math.floor(total / 2)) offset += total;

                          const isCenter = offset === 0;
                          const absOffset = Math.abs(offset);

                          let baseX = 0;
                          let baseY = -4;
                          let scale = 1.15;
                          let opacity = 1;
                          let zIndex = 10;

                          if (absOffset === 1) {
                            baseX = offset * 128;
                            baseY = 14;
                            scale = 0.64;
                            opacity = 0.95;
                            zIndex = 6;
                          } else if (absOffset === 2) {
                            baseX = offset * 116;
                            baseY = 20;
                            scale = 0.44;
                            opacity = 0.25;
                            zIndex = 3;
                          } else if (absOffset >= 3) {
                            baseX = offset < 0 ? -300 : 300;
                            baseY = 24;
                            scale = 0.28;
                            opacity = 0;
                            zIndex = 1;
                          }

                          const liveX =
                            absOffset <= 2 ? baseX + dragOffsetX * 0.35 : baseX;
                          const disableTransition =
                            absOffset === 4 || dragStartXRef.current !== null;

                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() =>
                                handleSavePreferences(avatar.id, selectedTone)
                              }
                              className={`${styles.carouselItem} ${
                                isCenter ? styles.carouselItemCenter : ''
                              }`}
                              style={{
                                transform: `translate3d(${liveX}px, ${baseY}px, 0) scale(${scale})`,
                                opacity,
                                zIndex,
                                pointerEvents: absOffset <= 2 ? 'auto' : 'none',
                                transition: disableTransition ? 'none' : undefined,
                              }}
                              aria-label={`Select ${avatar.name} avatar`}
                              aria-pressed={isCenter}
                            >
                              <RobotAvatar
                                size={120}
                                variant={avatar.id}
                                glow={isCenter}
                              />
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className={`${styles.carouselNavBtn} ${styles.carouselNavNext}`}
                        onClick={() => shiftCarousel(1)}
                        aria-label="Next avatar"
                      >
                        ›
                      </button>
                    </div>

                    {/* Pagination Dots per screens_v2/customise.png */}
                    <div className={styles.dotsRow} role="tablist" aria-label="Avatar positions">
                      {AVATAR_OPTIONS.map((avatar, idx) => {
                        const isActive = idx === activeAvatarIndex;
                        return (
                          <button
                            key={avatar.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-label={`Center ${avatar.name} avatar`}
                            onClick={() =>
                              handleSavePreferences(avatar.id, selectedTone)
                            }
                            className={
                              isActive ? styles.dotActive : styles.dotInactive
                            }
                          />
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Tone Selection View per Section 9 */
                  <div className={styles.toneSelectionView}>
                    {TONE_OPTIONS.map((tone) => {
                      const isSelected = selectedTone === tone.name;
                      return (
                        <button
                          key={tone.name}
                          type="button"
                          onClick={() =>
                            handleSavePreferences(selectedAppearance, tone.name)
                          }
                          aria-pressed={isSelected}
                          className={`${styles.toneCard} ${
                            isSelected ? styles.toneCardActive : ''
                          }`}
                        >
                          <div className={styles.toneHeaderRow}>
                            <span className={styles.toneName}>{tone.name}</span>
                            {isSelected && (
                              <span className={styles.toneSelectedBadge}>Selected</span>
                            )}
                          </div>
                          <p className={styles.toneDesc}>{tone.desc}</p>
                        </button>
                      );
                    })}
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
