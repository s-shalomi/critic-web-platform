'use client';

import React from 'react';
import styles from './LoadingOverlay.module.css';
import { RobotAvatar, RobotVariant } from '@/shared/components/RobotAvatar/RobotAvatar';

export interface LoadingOverlayProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  showProgressBar?: boolean;
  showAvatar?: boolean;
  avatarVariant?: RobotVariant;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  title = 'INITIALIZING...',
  subtitle = 'Compiling workspace and preparing learning environment...',
  fullScreen = false,
  showProgressBar = true,
  showAvatar = false,
  avatarVariant = 'aria',
  className = '',
}) => {
  const containerClass = fullScreen
    ? `${styles.overlayFullScreen} ${className}`
    : `${styles.overlayInline} ${className}`;

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div className={styles.glowBox}>
        {showAvatar ? (
          <div style={{ marginBottom: '4px' }}>
            <RobotAvatar variant={avatarVariant} size={48} />
          </div>
        ) : (
          <div className={styles.spinnerWrapper}>
            <div className={styles.spinnerOuter} />
            <div className={styles.spinnerInner} />
            <div className={styles.spinnerCoreDot} />
          </div>
        )}

        <h2 className={styles.overlayTitle}>{title}</h2>
        {subtitle && <p className={styles.overlaySub}>{subtitle}</p>}

        {showProgressBar && (
          <div className={styles.progressBarTrack}>
            <div className={styles.progressBarFill} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
