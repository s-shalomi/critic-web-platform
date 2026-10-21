'use client';

import React, { useState, useEffect } from 'react';
import styles from './StageProgressionNudge.module.css';
import { getStudentStorageKey } from '@/shared/utils/storage';

export type StageName = 'familiarise' | 'conceptualise' | 'inquire' | 'synthesise';

interface StageConfig {
  nextStageName: string;
}

const STAGE_CONFIGS: Record<StageName, StageConfig> = {
  familiarise: {
    nextStageName: 'Stage 02: Mind Map',
  },
  conceptualise: {
    nextStageName: 'Stage 03: Challenge',
  },
  inquire: {
    nextStageName: 'Stage 04: Conclude',
  },
  synthesise: {
    nextStageName: 'Module Review & Debrief',
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

  const dismissKey = getStudentStorageKey(`critic_nudge_dismissed_${currentStage}`, moduleId);
  const socraticKey = getStudentStorageKey(`critic_socratic_count_${currentStage}`, moduleId);

  useEffect(() => {
    setMounted(true);

    // Clean up any stale permanent dismissal from localStorage
    try {
      localStorage.removeItem(dismissKey);
      localStorage.removeItem(`critic_nudge_dismissed_${currentStage}`);
    } catch {
      // Ignore storage access error
    }

    try {
      const storedDismiss = sessionStorage.getItem(dismissKey);
      if (storedDismiss === 'true') {
        setDismissed(true);
      }
    } catch {
      // Ignore storage access error
    }

    const readStoredCount = () => {
      try {
        const val = parseInt(localStorage.getItem(socraticKey) || '0', 10);
        setInternalCount(val);
      } catch {
        // Ignore storage error
      }
    };

    readStoredCount();
    window.addEventListener('critic_socratic_sync', readStoredCount);
    window.addEventListener('storage', readStoredCount);

    return () => {
      window.removeEventListener('critic_socratic_sync', readStoredCount);
      window.removeEventListener('storage', readStoredCount);
    };
  }, [dismissKey, socraticKey, currentStage]);

  const effectiveCount = propQuestionCount !== undefined ? propQuestionCount : internalCount;

  if (!mounted || effectiveCount < threshold || dismissed) {
    return null;
  }

  const stageConfig = STAGE_CONFIGS[currentStage] || {
    nextStageName: 'Stage 04: Conclude',
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissKey, 'true');
    } catch {
      // Ignore storage error
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <aside
      className={`${styles.nudgeBanner} ${className}`}
      role="status"
      aria-live="polite"
      data-testid="stage-progression-nudge"
    >
      <div className={styles.leftGroup}>
        <div className={styles.milestoneBadge}>
          <span className={styles.milestoneIcon}>💡</span>
          <span>{effectiveCount} Socratic Questions Reached</span>
        </div>
        <p className={styles.bannerText}>
          You&apos;ve explored <strong>{effectiveCount} Socratic questions</strong> in this stage!
          Consider moving forward to{' '}
          <span className={styles.highlightStage}>{stageConfig.nextStageName}</span> when you&apos;re ready.
          <span className={styles.returnLaterNote}>
            (You can always return to this stage later to refine your work.)
          </span>
        </p>
      </div>

      <div className={styles.actionsGroup}>
        <button
          type="button"
          onClick={handleDismiss}
          className={styles.dismissBtn}
          title="Dismiss notification"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </aside>
  );
};

export default StageProgressionNudge;
