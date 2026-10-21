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
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [internalCount, setInternalCount] = useState<number>(0);

  const socraticKey = getStudentStorageKey(`critic_socratic_count_${currentStage}`, moduleId);

  useEffect(() => {
    setMounted(true);

    // Clear any stale legacy dismissal keys from prior sessions to ensure fresh visibility
    try {
      localStorage.removeItem(`critic_nudge_dismissed_${currentStage}`);
      localStorage.removeItem(getStudentStorageKey(`critic_nudge_dismissed_${currentStage}`, moduleId));
      sessionStorage.removeItem(getStudentStorageKey(`critic_nudge_dismissed_${currentStage}`, moduleId));
    } catch {
      // Ignore storage cleanup errors
    }

    const readStoredCount = () => {
      try {
        const val1 = parseInt(localStorage.getItem(socraticKey) || '0', 10);
        const val2 = parseInt(localStorage.getItem(`critic_socratic_count_${currentStage}`) || '0', 10);
        const val3 = parseInt(localStorage.getItem(getStudentStorageKey('critic_hints', moduleId)) || '0', 10);
        const val4 = parseInt(localStorage.getItem('critic_hints') || '0', 10);
        setInternalCount(Math.max(val1, val2, val3, val4));
      } catch {
        // Ignore storage error
      }
    };

    readStoredCount();
    window.addEventListener('critic_socratic_sync', readStoredCount);
    window.addEventListener('storage', readStoredCount);
    window.addEventListener('focus', readStoredCount);
    const pollInterval = setInterval(readStoredCount, 800);

    return () => {
      window.removeEventListener('critic_socratic_sync', readStoredCount);
      window.removeEventListener('storage', readStoredCount);
      window.removeEventListener('focus', readStoredCount);
      clearInterval(pollInterval);
    };
  }, [socraticKey, currentStage, moduleId]);

  const effectiveCount = Math.max(propQuestionCount ?? 0, internalCount);

  if (!mounted || effectiveCount < threshold || dismissed) {
    return null;
  }

  const stageConfig = STAGE_CONFIGS[currentStage] || STAGE_CONFIGS.inquire;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

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
          <span className={styles.countPill}>{effectiveCount} Socratic Questions</span>
        </div>
        <p className={styles.notificationMessage}>
          {stageConfig.renderPrompt(effectiveCount)}
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
