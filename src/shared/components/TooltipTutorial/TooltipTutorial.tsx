'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './TooltipTutorial.module.css';

export interface TutorialStep {
  targetSelector: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

export interface TooltipTutorialProps {
  stageName: string;
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function TooltipTutorial({
  stageName,
  steps,
  isOpen,
  onClose,
  onComplete,
}: TooltipTutorialProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [computedPosition, setComputedPosition] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  }>({
    top: 0,
    left: 0,
    placement: 'center',
  });

  const tooltipRef = useRef<HTMLDivElement>(null);

  // Reset to first step whenever reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const currentStep = steps[currentStepIndex];

  // Calculate target element position and optimal tooltip placement
  const updatePosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    let el = document.querySelector(currentStep.targetSelector);
    if (!el && currentStep.targetSelector === '[data-tour="concept-node"]') {
      el = document.querySelector('[data-tour="concept-canvas"]');
    }

    if (!el) {
      setTargetRect(null);
      setComputedPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        placement: 'center',
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    });

    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 360;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 200;
    const margin = 16;
    const padding = 16;

    let pref = currentStep.placement || 'auto';

    // Auto-detect optimal placement if auto
    if (pref === 'auto') {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;

      if (spaceBelow >= tooltipHeight + margin) {
        pref = 'bottom';
      } else if (spaceAbove >= tooltipHeight + margin) {
        pref = 'top';
      } else if (spaceRight >= tooltipWidth + margin) {
        pref = 'right';
      } else if (spaceLeft >= tooltipWidth + margin) {
        pref = 'left';
      } else {
        pref = 'bottom';
      }
    }

    let top = 0;
    let left = 0;

    if (pref === 'bottom') {
      top = rect.bottom + margin;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    } else if (pref === 'top') {
      top = rect.top - tooltipHeight - margin;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    } else if (pref === 'left') {
      left = rect.left - tooltipWidth - margin;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else if (pref === 'right') {
      left = rect.right + margin;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    }

    // Viewport boundary clamping
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

    setComputedPosition({
      top,
      left,
      placement: pref as 'top' | 'bottom' | 'left' | 'right' | 'center',
    });
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    const timer = setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      clearTimeout(timer);
    };
  }, [isOpen, currentStepIndex, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          if (onComplete) onComplete();
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length, onClose, onComplete]);

  if (!isOpen || !currentStep) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      if (onComplete) onComplete();
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className={styles.tutorialRoot} aria-modal="true" role="dialog" aria-label="Interactive Onboarding Tutorial">
      {/* Semi-transparent Dark Backdrop */}
      <div className={styles.backdrop} onClick={handleSkip} />

      {/* Spotlight cutout border over target element */}
      {targetRect && (
        <div
          className={styles.spotlightRing}
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Floating Tooltip Card */}
      <div
        ref={tooltipRef}
        className={`${styles.tooltipCard} ${
          computedPosition.placement === 'center' ? styles.tooltipCentered : ''
        }`}
        style={
          computedPosition.placement === 'center'
            ? {}
            : {
                top: `${computedPosition.top}px`,
                left: `${computedPosition.left}px`,
              }
        }
      >
        {/* Directional Arrow */}
        {targetRect && computedPosition.placement !== 'center' && (
          <div
            className={`${styles.tooltipArrow} ${styles[`arrow_${computedPosition.placement}`]}`}
          />
        )}

        {/* Top Header Row */}
        <div className={styles.headerRow}>
          <div className={styles.badgeGroup}>
            <span className={styles.stageBadge}>{stageName} Stage</span>
            <span className={styles.stepBadge}>
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className={styles.closeBtn}
            aria-label="Skip tutorial"
            title="Skip tutorial"
          >
            ✕
          </button>
        </div>

        {/* Title & Body */}
        <h4 className={styles.stepTitle}>{currentStep.title}</h4>
        <p className={styles.stepContent}>{currentStep.content}</p>

        {/* Step Indicator Progress Dots */}
        <div className={styles.dotsRow}>
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={`${styles.progressDot} ${
                idx === currentStepIndex ? styles.activeDot : ''
              } ${idx < currentStepIndex ? styles.completedDot : ''}`}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className={styles.actionsRow}>
          <button
            type="button"
            onClick={handleSkip}
            className={styles.skipBtn}
            aria-label="Skip tutorial"
          >
            Skip
          </button>

          <div className={styles.navBtnGroup}>
            {!isFirst && (
              <button
                type="button"
                onClick={handleBack}
                className={styles.backBtn}
                aria-label="Previous step"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={styles.nextBtn}
              aria-label={isLast ? 'Complete tutorial' : 'Next step'}
            >
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
