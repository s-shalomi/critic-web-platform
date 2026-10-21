'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './StageNavigationDock.module.css';

export type StageId = 'familiarise' | 'conceptualise' | 'inquire' | 'synthesise';

export interface StageItem {
  id: StageId;
  num: string;
  label: string;
  path: string;
}

export const STAGES: StageItem[] = [
  { id: 'familiarise', num: '01', label: 'Annotate', path: 'familiarise' },
  { id: 'conceptualise', num: '02', label: 'Mind Map', path: 'conceptualise' },
  { id: 'inquire', num: '03', label: 'Challenge', path: 'inquire' },
  { id: 'synthesise', num: '04', label: 'Conclude', path: 'synthesise' },
];

export interface StageNavigationDockProps {
  currentStage: StageId;
  moduleId: string;
  className?: string;
  onBeforeNavigate?: (targetStage: StageId) => void;
}

export const StageNavigationDock: React.FC<StageNavigationDockProps> = ({
  currentStage,
  moduleId,
  className = '',
  onBeforeNavigate,
}) => {
  const router = useRouter();
  const [navigatingStage, setNavigatingStage] = useState<StageId | null>(null);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  // Listen for explicit live save events
  useEffect(() => {
    const handleTrigger = () => {
      setShowSavedToast(true);
      const timer = setTimeout(() => {
        setShowSavedToast(false);
      }, 2500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('critic_show_saved_toast', handleTrigger);
    return () => window.removeEventListener('critic_show_saved_toast', handleTrigger);
  }, []);

  // Pre-fetch all stage chunks in advance for instantaneous transitions
  useEffect(() => {
    STAGES.forEach((s) => {
      if (s.id !== currentStage) {
        try {
          router.prefetch(`/module/${moduleId}/${s.path}`);
        } catch {
          // Pre-fetch safe fallback
        }
      }
    });
  }, [router, moduleId, currentStage]);

  const handleStageClick = (stage: StageItem) => {
    if (stage.id === currentStage) return;
    if (navigatingStage) return; // Prevent duplicate rapid clicks

    setNavigatingStage(stage.id);

    // Show saved indicator immediately on leaving current stage (not on entering)
    setShowSavedToast(true);

    if (onBeforeNavigate) {
      try {
        onBeforeNavigate(stage.id);
      } catch (e) {
        console.error('Error in onBeforeNavigate callback:', e);
      }
    }

    try {
      router.prefetch(`/module/${moduleId}/${stage.path}`);
    } catch {
      // Safe fallback
    }

    // Brief delay so student visibly sees the "Progress Saved" confirmation before routing away
    setTimeout(() => {
      router.push(`/module/${moduleId}/${stage.path}`);
    }, 450);
  };

  return (
    <div className={`${styles.stageNavWrapper} ${className}`} data-tour="stage-dock">
      {/* 'Saved' Floating Notification Toast */}
      {showSavedToast && (
        <div
          className={styles.savedNotification}
          role="status"
          aria-live="polite"
          data-testid="saved-notification"
        >
          <span className={styles.savedIcon}>✓</span>
          <span>Saved</span>
        </div>
      )}

      <nav className={styles.stageNavBar} aria-label="Module stages navigation dock">
        {/* Animated Top Progress Bar when jumping stages */}
        {navigatingStage && (
          <div className={styles.dockProgressBar}>
            <div className={styles.dockProgressFill} />
          </div>
        )}

        {STAGES.map((s) => {
          const isActive = s.id === currentStage;
          const isTargetLoading = navigatingStage === s.id;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handleStageClick(s)}
              disabled={Boolean(navigatingStage) && !isTargetLoading}
              className={`${styles.stageStep} ${isActive ? styles.stageStepActive : ''} ${
                isTargetLoading ? styles.stageStepLoading : ''
              }`}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Jump to stage ${s.num}: ${s.label}${isTargetLoading ? ' (loading)' : ''}`}
            >
              <span
                className={`${styles.stageCircle} ${isActive ? styles.stageCircleActive : ''} ${
                  isTargetLoading ? styles.stageCircleLoading : ''
                }`}
              >
                {isTargetLoading ? (
                  <span className={styles.circleSpinner} />
                ) : (
                  <span>{s.num}</span>
                )}
              </span>

              <span className={styles.stageLabel}>
                {isTargetLoading ? `${s.label}...` : s.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default StageNavigationDock;
