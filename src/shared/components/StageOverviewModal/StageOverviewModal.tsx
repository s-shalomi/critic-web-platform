'use client';

import React, { useEffect } from 'react';
import styles from './StageOverviewModal.module.css';

import {
  STAGE_OVERVIEWS,
  type StageOverviewInfo,
} from '@/shared/config/stageOverviews';

export { STAGE_OVERVIEWS, type StageOverviewInfo };

export interface StageOverviewModalProps {
  stage: 'familiarise' | 'conceptualise' | 'inquire' | 'synthesise';
  isOpen: boolean;
  onClose: () => void;
}

export function StageOverviewModal({ stage, isOpen, onClose }: StageOverviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const info = STAGE_OVERVIEWS[stage];

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="overview-modal-title"
    >
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Close stage overview"
        >
          ✕
        </button>

        <div className={styles.badgeRow}>
          <span className={styles.stageBadge}>{info.badge}</span>
        </div>

        <h3 id="overview-modal-title" className={styles.modalTitle}>
          Why {info.stageName} Matters
        </h3>

        {/* Why this stage is important */}
        <div className={styles.importanceBox}>
          <div className={styles.importanceHeader}>
            <span className={styles.importanceIcon}>💡</span>
            <span className={styles.importanceTitle}>Why This Stage Is Important</span>
          </div>
          <p className={styles.importanceText}>{info.whyImportant}</p>
        </div>

        {/* Brief overview of what to do */}
        <div className={styles.overviewSection}>
          <h4 className={styles.sectionHeading}>What To Do In This Stage:</h4>
          <ul className={styles.overviewList}>
            {info.overviewItems.map((item, idx) => (
              <li key={idx} className={styles.overviewItem}>
                <span className={styles.itemNumber}>{idx + 1}</span>
                <div className={styles.itemContent}>
                  <strong className={styles.itemTitle}>{item.title}</strong>
                  <span className={styles.itemDesc}>{item.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.footerRow}>
          <button type="button" onClick={onClose} className={styles.gotItBtn}>
            Got it, let&apos;s go
          </button>
        </div>
      </div>
    </div>
  );
}
