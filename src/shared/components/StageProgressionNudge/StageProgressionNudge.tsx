'use client';

import React, { useState, useEffect } from 'react';
import styles from './StageProgressionNudge.module.css';
import { getStudentStorageKey } from '@/shared/utils/storage';

export type StageName = 'familiarise' | 'conceptualise' | 'inquire';

interface StageConfig {
  nextStageName: string;
  renderPrompt: (count: number) => React.ReactNode;
}

const STAGE_CONFIGS: Record<StageName, StageConfig> = {
  familiarise: {
    nextStageName: 'Stage 02: Mind Map',
    renderPrompt: (count: number) => (
      <>
        You&apos;ve explored <strong>{count} Socratic questions</strong> in this stage!
        Consider moving to the next source or moving forward to{' '}
        <span className={styles.highlightStage}>Stage 02: Mind Map</span> when you&apos;re ready.
        <span className={styles.returnLaterNote}>
          (You can always return to this stage later to refine your work.)
        </span>
      </>
    ),
  },
  conceptualise: {
    nextStageName: 'Stage 03: Challenge',
    renderPrompt: (count: number) => (
      <>
        You&apos;ve explored <strong>{count} Socratic questions</strong> in this stage!
        Consider moving forward to{' '}
        <span className={styles.highlightStage}>Stage 03: Challenge</span> when you&apos;re ready.
        <span className={styles.returnLaterNote}>
          (You can always return to this stage later to refine your work.)
        </span>
      </>
    ),
  },
  inquire: {
    nextStageName: 'Stage 04: Conclude',
    renderPrompt: (count: number) => (
      <>
        You&apos;ve explored <strong>{count} Socratic questions</strong> in this stage!
        Consider moving forward to{' '}
        <span className={styles.highlightStage}>Stage 04: Conclude</span> when you&apos;re ready.
        <span className={styles.returnLaterNote}>
          (You can always return to this stage later to refine your work.)
        </span>
      </>
    ),
  },
};

export interface StageProgressionNudgeProps {
  currentStage?: StageName;
  moduleId: string;
  questionCount?: number;
  threshold?: number;
  onDismiss?: () => void;
  className?: string;
}

export const StageProgressionNudge: React.FC<StageProgressionNudgeProps> = ({
  currentStage = 'inquire',
  moduleId,
  questionCount: propQuestionCount,
  threshold = 10,
  onDismiss,
  className = '',
}) => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [internalCount, setInternalCount] = useState<number>(0);
  const [lastSeenMilestone, setLastSeenMilestone] = useState<number>(0);
  const [hasCrossedMilestoneInSession, setHasCrossedMilestoneInSession] = useState<boolean>(false);
  const [activeMilestone, setActiveMilestone] = useState<number>(0);

  const socraticKey = getStudentStorageKey(`critic_socratic_count_${currentStage}`, moduleId);
  const milestoneSeenKey = getStudentStorageKey(`critic_nudge_seen_milestone_${currentStage}`, moduleId);

  // Track previous count across turns to strictly trigger ONLY when actively crossing a milestone (10, 20, 30...)
  const prevCountRef = React.useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);

    const getStoredQuestionsCount = (): number => {
      try {
        const val1 = parseInt(localStorage.getItem(socraticKey) || '0', 10);
        const val2 = parseInt(localStorage.getItem(`critic_socratic_count_${currentStage}`) || '0', 10);
        const val3 = parseInt(localStorage.getItem(getStudentStorageKey('critic_hints', moduleId)) || '0', 10);
        const val4 = parseInt(localStorage.getItem('critic_hints') || '0', 10);
        return Math.max(val1, val2, val3, val4);
      } catch {
        return 0;
      }
    };

    const initialCount = Math.max(propQuestionCount ?? 0, getStoredQuestionsCount());
    setInternalCount(initialCount);

    // Baseline on stage entry:
    // Initialize prevCountRef to the count on entry, ensuring banner NEVER shows on initial stage entry/reload
    if (prevCountRef.current === null) {
      prevCountRef.current = initialCount;
      const entryMilestone = Math.floor(initialCount / 10) * 10;
      try {
        const storedMilestone = localStorage.getItem(milestoneSeenKey);
        const parsed = storedMilestone !== null ? parseInt(storedMilestone, 10) : 0;
        const highestSeen = Math.max(parsed, entryMilestone);
        localStorage.setItem(milestoneSeenKey, String(highestSeen));
        setLastSeenMilestone(highestSeen);
      } catch {}
    }

    const checkAndSyncCount = () => {
      try {
        const storedCount = getStoredQuestionsCount();
        const currentCount = Math.max(propQuestionCount ?? 0, storedCount);
        setInternalCount(currentCount);

        const storedMilestone = parseInt(localStorage.getItem(milestoneSeenKey) || '0', 10);
        setLastSeenMilestone(storedMilestone);

        const currentMilestone = Math.floor(currentCount / 10) * 10;
        // Strictly trigger only if actively crossing from below currentMilestone to at/above it during this session
        if (
          prevCountRef.current !== null &&
          currentMilestone >= threshold &&
          prevCountRef.current < currentMilestone &&
          currentMilestone > storedMilestone
        ) {
          setActiveMilestone(currentMilestone);
          setHasCrossedMilestoneInSession(true);
        }

        prevCountRef.current = currentCount;
      } catch {
        // Ignore storage error
      }
    };

    window.addEventListener('critic_socratic_sync', checkAndSyncCount);
    window.addEventListener('storage', checkAndSyncCount);
    window.addEventListener('focus', checkAndSyncCount);
    const pollInterval = setInterval(checkAndSyncCount, 600);

    return () => {
      window.removeEventListener('critic_socratic_sync', checkAndSyncCount);
      window.removeEventListener('storage', checkAndSyncCount);
      window.removeEventListener('focus', checkAndSyncCount);
      clearInterval(pollInterval);
    };
  }, [socraticKey, milestoneSeenKey, currentStage, moduleId, threshold, propQuestionCount]);

  // Synchronously detect active milestone crossing when propQuestionCount updates (e.g. Inquire chat or avatar click)
  useEffect(() => {
    if (propQuestionCount === undefined) return;
    const currentCount = Math.max(propQuestionCount, internalCount);
    const currentMilestone = Math.floor(currentCount / 10) * 10;

    if (
      prevCountRef.current !== null &&
      currentMilestone >= threshold &&
      prevCountRef.current < currentMilestone &&
      currentMilestone > lastSeenMilestone
    ) {
      setActiveMilestone(currentMilestone);
      setHasCrossedMilestoneInSession(true);
    }

    prevCountRef.current = currentCount;
  }, [propQuestionCount, internalCount, threshold, lastSeenMilestone]);

  const handleDismiss = () => {
    setHasCrossedMilestoneInSession(false);
    const milestoneToSave = activeMilestone || Math.floor(Math.max(propQuestionCount ?? 0, internalCount) / 10) * 10;
    setLastSeenMilestone(milestoneToSave);
    try {
      localStorage.setItem(milestoneSeenKey, String(milestoneToSave));
    } catch {}
    if (onDismiss) {
      onDismiss();
    }
  };

  // The banner NEVER shows on stage entry. It ONLY renders when a milestone (10, 20, 30...)
  // was actively crossed during the current session.
  if (!mounted || !hasCrossedMilestoneInSession) {
    return null;
  }

  const stageConfig = STAGE_CONFIGS[currentStage] || STAGE_CONFIGS.inquire;
  const displayMilestone = activeMilestone || 10;

  return (
    <aside
      className={`${styles.notificationToast} ${className}`}
      role="status"
      aria-live="polite"
      data-testid="stage-progression-nudge"
    >
      <div className={styles.iconContainer}>
        <div className={styles.iconGlowWrapper}>
          <span className={styles.notificationIcon}>💡</span>
        </div>
      </div>

      <div className={styles.contentBody}>
        <div className={styles.headerRow}>
          <span className={styles.milestoneTag}>Stage Progression Milestone</span>
          <span className={styles.countPill}>{displayMilestone} Socratic Questions</span>
        </div>
        <p className={styles.notificationMessage}>
          {stageConfig.renderPrompt(displayMilestone)}
        </p>
      </div>

      <div className={styles.actionsGroup}>
        <button
          type="button"
          onClick={handleDismiss}
          className={styles.dismissBtn}
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default StageProgressionNudge;
