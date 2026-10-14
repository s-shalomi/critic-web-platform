'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './synthesise.module.css';

import {
  getStudentStorageKey,
  hasSeenModuleDisclosure,
  markModuleDisclosureSeen,
  hasSeenStageTutorial,
  markStageTutorialSeen,
} from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';
import ConceptMapCanvas from '@/shared/components/ConceptMapCanvas/ConceptMapCanvas';
import {
  RobotAvatar,
  getStoredAgentPreferences,
  getStageOpener,
  DEFAULT_AGENT_PREFERENCES,
  ResolvedAgentPreferences,
} from '@/shared/components/RobotAvatar/RobotAvatar';
import { TooltipTutorial } from '@/shared/components/TooltipTutorial/TooltipTutorial';
import { StageOverviewModal } from '@/shared/components/StageOverviewModal/StageOverviewModal';
import { STAGE_TUTORIAL_STEPS } from '@/shared/config/tutorials';
import { StageNavigationDock } from '@/shared/components/StageNavigationDock/StageNavigationDock';

export default function SynthesiseStagePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [synthesisText, setSynthesisText] = useState<string>('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showOverviewModal, setShowOverviewModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [agentPrefs, setAgentPrefs] = useState<ResolvedAgentPreferences>(DEFAULT_AGENT_PREFERENCES);

  // Evidence notes count for non-blocking AI nudge
  const [notesCount, setNotesCount] = useState<number>(0);
  const [showNudge, setShowNudge] = useState<boolean>(true);

  const handleCloseHelpModal = () => {
    setShowHelpModal(false);
    if (!hasSeenStageTutorial(moduleId, 'synthesise')) {
      setShowTutorialModal(true);
    }
  };

  const handleCloseTutorial = () => {
    setShowTutorialModal(false);
    markStageTutorialSeen(moduleId, 'synthesise');
  };

  useEffect(() => {
    const synthKey = getStudentStorageKey('critic_synthesis', moduleId);
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    setAgentPrefs(getStoredAgentPreferences());

    // Show mandatory AI disclosure automatically once when the student first enters the module
    if (!hasSeenModuleDisclosure(moduleId)) {
      setShowHelpModal(true);
      markModuleDisclosureSeen(moduleId);
    } else if (!hasSeenStageTutorial(moduleId, 'synthesise')) {
      setShowTutorialModal(true);
    }

    reportStudentProgress('synthesise');

    const handleFocus = () => setAgentPrefs(getStoredAgentPreferences());
    window.addEventListener('focus', handleFocus);

    // 0. Load notes count for AI nudge
    const localNotesStr = localStorage.getItem(notesKey);
    if (localNotesStr) {
      try {
        const parsed = JSON.parse(localNotesStr);
        setNotesCount(parsed.length);
      } catch (e) {
        console.error(e);
      }
    }
    fetch(`/api/modules/${moduleId}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes) {
          setNotesCount((prev) => Math.max(prev, data.notes.length));
        }
      });

    // 1. Load synthesis draft
    const localSynth = localStorage.getItem(synthKey);
    if (localSynth) {
      setSynthesisText(localSynth);
    } else {
      fetch(`/api/modules/${moduleId}/synthesis`)
        .then((res) => res.json())
        .then((data) => {
          if (data.synthesisDraft) setSynthesisText(data.synthesisDraft);
        });
    }

    return () => window.removeEventListener('focus', handleFocus);
  }, [moduleId]);

  const handleSynthesisTextChange = (text: string) => {
    setSynthesisText(text);
    const synthKey = getStudentStorageKey('critic_synthesis', moduleId);
    localStorage.setItem(synthKey, text);
  };

  const handleCrossCheckSynthesis = async () => {
    if (!synthesisText.trim()) return;
    setLoading(true);
    setAiFeedback(null);

    try {
      const notesKey = getStudentStorageKey('critic_notes', moduleId);
      const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
      const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);
      const chatKey = getStudentStorageKey('critic_chat', moduleId);
      let localNotes: any[] = [];
      let localNodes: any[] = [];
      let localLinks: any[] = [];
      let localChat: any[] = [];
      try {
        localNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        localNodes = JSON.parse(localStorage.getItem(nodesKey) || '[]');
        localLinks = JSON.parse(localStorage.getItem(linksKey) || '[]');
        localChat = JSON.parse(localStorage.getItem(chatKey) || '[]');
      } catch (e) {
        /* ignore parse error */
      }

      const res = await fetch(`/api/modules/${moduleId}/synthesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          synthesisText,
          notes: Array.isArray(localNotes) ? localNotes : [],
          conceptNodes: Array.isArray(localNodes) ? localNodes : [],
          conceptLinks: Array.isArray(localLinks) ? localLinks : [],
          chatHistory: Array.isArray(localChat) ? localChat : [],
          agentPersonality: `${agentPrefs.toneName} (${agentPrefs.toneDesc})`,
          avatarName: agentPrefs.avatarName,
        }),
      });

      const data = await res.json();
      if (data.success && data.feedback) {
        setAiFeedback(data.feedback);
      } else {
        throw new Error('No feedback in response');
      }
    } catch (err) {
      setAiFeedback(
        '⚠️ AI service is temporarily busy. Please click Retry to re-run your synthesis audit.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteModule = () => {
    router.push(`/module/${moduleId}/review`);
  };

  return (
    <div className={styles.container}>
      {/* Main Split Workspace */}
      <div className={styles.workspace}>
        {/* Left Conclude Panel matching screens_v2/synthesis.png */}
        <aside className={styles.leftConcludePanel}>
          <div className={styles.topHeaderRow}>
            <button onClick={() => router.push('/dashboard')} className={styles.backBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Climate Change</span>
            </button>
          </div>

          <div className={styles.headingRow}>
            <h1 className={styles.sidebarHeading}>Conclude</h1>
            <div className={styles.agentStatusRow}>
              <div className={styles.agentTonePill} title={`Active persona: ${agentPrefs.avatarName} (${agentPrefs.toneName})`}>
                <span className={styles.agentToneName}>{agentPrefs.avatarName}</span>
                <span className={styles.agentToneDot}>•</span>
                <span>Tone: {agentPrefs.toneName}</span>
              </div>
            </div>
          </div>

          {/* Non-blocking AI Contextual Nudge Banner */}
          {notesCount === 0 && showNudge && (
            <div className={styles.nudgeBanner}>
              <span>
                💡 <strong>AI Learning Nudge:</strong> Gather evidence notes in <strong>Annotate</strong> so{' '}
                {agentPrefs.avatarName} can cross-reference your conclusions.
              </span>
              <button
                onClick={() => setShowNudge(false)}
                className={styles.nudgeCloseBtn}
                aria-label="Dismiss nudge"
              >
                ✕
              </button>
            </div>
          )}

          {/* Rounded Dark Slate Container matching screens_v2/synthesis.png */}
          <div className={styles.concludeCardContainer}>
            {/* Top Agent Prompt + Optional Reasoning Audit Area */}
            <div className={styles.promptHistoryArea}>
              <div className={styles.agentPromptRow}>
                <div className={styles.agentAvatarIcon}>
                  <RobotAvatar variant={agentPrefs.appearance} size={46} />
                </div>
                <div className={styles.agentBubble}>
                  <p className={styles.messageText}>
                    {getStageOpener('synthesise', agentPrefs.toneName)}
                  </p>
                </div>
              </div>

              {loading && (
                <div className={styles.agentPromptRow}>
                  <div className={styles.agentAvatarIcon}>
                    <RobotAvatar variant={agentPrefs.appearance} size={46} />
                  </div>
                  <div className={styles.loadingBubble}>
                    <span className={styles.dot}></span>
                    <span className={styles.dot}></span>
                    <span className={styles.dot}></span>
                    <span className={styles.loadingText}>
                      {agentPrefs.avatarName} ({agentPrefs.toneName}) is auditing your conclusion...
                    </span>
                  </div>
                </div>
              )}

              {aiFeedback && !loading && (
                <div className={styles.agentPromptRow}>
                  <div className={styles.agentAvatarIcon}>
                    <RobotAvatar variant={agentPrefs.appearance} size={46} />
                  </div>
                  <div className={`${styles.agentBubble} ${styles.auditFeedbackBubble}`}>
                    <div className={styles.auditTag}>
                      🔍 {agentPrefs.avatarName.toUpperCase()} ({agentPrefs.toneName.toUpperCase()}) REASONING AUDIT
                    </div>
                    <p className={styles.messageText}>{aiFeedback}</p>
                    {aiFeedback.includes('⚠️') && (
                      <button
                        type="button"
                        onClick={handleCrossCheckSynthesis}
                        style={{
                          marginTop: '8px',
                          padding: '5px 12px',
                          borderRadius: '999px',
                          border: '1px solid #37F3FF',
                          background: 'rgba(55, 243, 255, 0.14)',
                          color: '#37F3FF',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ↻ Retry Audit
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Conclusion Input Box inside the Slate Card matching screens_v2/synthesis.png */}
            <div className={styles.conclusionBoxWrapper}>
              <div className={styles.conclusionBox} data-tour="conclusion-box">
                <textarea
                  className={styles.synthesisTextArea}
                  placeholder="What conclusions can you make?"
                  value={synthesisText}
                  onChange={(e) => handleSynthesisTextChange(e.target.value)}
                />
                <div className={styles.boxActionsRow}>
                  <button
                    type="button"
                    onClick={handleCrossCheckSynthesis}
                    className={styles.auditBtn}
                    data-tour="audit-btn"
                    disabled={loading || !synthesisText.trim()}
                    title={`Ask ${agentPrefs.avatarName} to Socratic-audit your conclusion before submitting`}
                  >
                    {loading ? 'Auditing...' : `Audit with ${agentPrefs.avatarName}`}
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteModule}
                    className={styles.submitModuleBtn}
                    data-tour="submit-btn"
                  >
                    Submit Module
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Interactive Concept Map Canvas with Top-Right AI Disclosure, Tutorial & Help Buttons */}
        <div className={styles.rightCanvasWrapper}>
          <div className={styles.topRightActions}>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className={styles.disclosureBtn}
              aria-label="AI Disclosure"
              title="View AI Agent Disclosure"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>AI Disclosure</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTutorialModal(true)}
              className={styles.tutorialBtn}
              data-tour="tutorial-btn"
              title="View Stage Tutorial"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
              </svg>
              <span>Tutorial</span>
            </button>
            <button
              type="button"
              onClick={() => setShowOverviewModal(true)}
              className={styles.helpCircleBtn}
              data-tour="help-btn"
              aria-label="Help"
              title="Stage Overview: Why Synthesising a Conclusion Matters"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
          </div>

          <ConceptMapCanvas moduleId={moduleId} stageTitle="synthesise" />
        </div>
      </div>

      {/* Floating Bottom Stage Navigation Dock with Dynamic Stage Transition Indicators */}
      <StageNavigationDock currentStage="synthesise" moduleId={moduleId} />

      {/* Interactive Tooltip Onboarding Tutorial */}
      <TooltipTutorial
        stageName="Conclude"
        steps={STAGE_TUTORIAL_STEPS.synthesise}
        isOpen={showTutorialModal}
        onClose={handleCloseTutorial}
        onComplete={handleCloseTutorial}
      />

      {/* Stage Overview Modal (? Button) */}
      <StageOverviewModal
        stage="synthesise"
        isOpen={showOverviewModal}
        onClose={() => setShowOverviewModal(false)}
      />

      {/* Mandatory AI Disclosure Modal */}
      {showHelpModal && (
        <div className={styles.modalBackdrop} onClick={handleCloseHelpModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleCloseHelpModal}
              className={styles.modalCloseBtn}
              aria-label="Close disclosure"
            >
              ✕
            </button>
            <h3 className={styles.modalTitle}>AI Agent Disclosure</h3>
            <p className={styles.modalLead}>
              Before interacting with <strong>{agentPrefs.avatarName}</strong> ({agentPrefs.toneName}{' '}
              tone) in this module, please note how the AI peer operates:
            </p>
            <div className={styles.disclosureBox}>
              <strong className={styles.disclosureHeading}>
                ⚠️ Important Notice ({agentPrefs.avatarName} • {agentPrefs.toneName} Tone):
              </strong>
              <ol className={styles.disclosureList}>
                <li>
                  The agent will use <strong>Socratic questioning</strong>.
                </li>
                <li>
                  The agent may present arguments it does not itself &lsquo;believe&rsquo; in order
                  to test reasoning.
                </li>
                <li>
                  You should <strong>not treat the agent&apos;s statements as verified fact</strong>.
                </li>
              </ol>
            </div>
            <button
              type="button"
              onClick={handleCloseHelpModal}
              className={styles.modalPrimaryBtn}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
