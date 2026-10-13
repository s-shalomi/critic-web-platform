'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './synthesise.module.css';

import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';
import ConceptMapCanvas from '@/shared/components/ConceptMapCanvas/ConceptMapCanvas';
import {
  RobotAvatar,
  getStoredAgentPreferences,
  DEFAULT_AGENT_PREFERENCES,
  ResolvedAgentPreferences,
} from '@/shared/components/RobotAvatar/RobotAvatar';

export default function SynthesiseStagePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [synthesisText, setSynthesisText] = useState<string>('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showIntroModal, setShowIntroModal] = useState<boolean>(true);
  const [agentPrefs, setAgentPrefs] = useState<ResolvedAgentPreferences>(DEFAULT_AGENT_PREFERENCES);

  // Evidence notes count for non-blocking AI nudge
  const [notesCount, setNotesCount] = useState<number>(0);
  const [showNudge, setShowNudge] = useState<boolean>(true);

  useEffect(() => {
    const synthKey = getStudentStorageKey('critic_synthesis', moduleId);
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    setAgentPrefs(getStoredAgentPreferences());

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
          setNotesCount(data.notes.length);
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
      const res = await fetch(`/api/modules/${moduleId}/synthesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          synthesisText,
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
        'Have you considered connecting the evidence from the sources to your conclusions? What counter-arguments remain unaddressed in your synthesis?'
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
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => router.push('/dashboard')} className={styles.backBtn}>
          ← Climate Change
        </button>
      </header>

      {/* Non-blocking AI Contextual Nudge Banner */}
      {notesCount === 0 && showNudge && (
        <div
          style={{
            background: 'rgba(55, 243, 255, 0.12)',
            borderBottom: '1px solid var(--primary-cyan)',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--text-light)',
            fontSize: '0.9rem',
          }}
        >
          <span>
            💡 <strong>AI Learning Nudge:</strong> You haven&apos;t gathered evidence notes in the{' '}
            <strong>Familiarise</strong> stage yet! Gathering notes helps {agentPrefs.avatarName} cross-reference your reasoning.
            You can continue exploring here or return to Familiarise anytime.
          </span>
          <button
            onClick={() => setShowNudge(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary-cyan)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              marginLeft: '16px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Split */}
      <div className={styles.workspace}>
        {/* Left Interactive Synthesis Editor Panel */}
        <aside className={styles.leftEditorPanel}>
          <div className={styles.editorHeader}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <h2 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.15rem', margin: 0 }}>
                FINAL CASEFILE SYNTHESIS
              </h2>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(15, 23, 46, 0.85)',
                  border: '1px solid rgba(55, 243, 255, 0.35)',
                  borderRadius: '9999px',
                  padding: '4px 10px 4px 6px',
                }}
              >
                <RobotAvatar variant={agentPrefs.appearance} size={24} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.76rem', color: '#D9DFF7' }}>
                  <strong style={{ color: '#37F3FF' }}>{agentPrefs.avatarName}</strong> • Tone: {agentPrefs.toneName}
                </span>
              </div>
            </div>
            <p className={styles.editorSubtitle}>
              Synthesise your evidence, arguments, and evaluate opposing views into your final case.
            </p>
          </div>

          <div className={styles.textAreaContainer}>
            <textarea
              className={styles.synthesisTextArea}
              placeholder="Write your casefile conclusion here... Structure your reasoning, cite concepts from your map, and address counterarguments."
              value={synthesisText}
              onChange={(e) => handleSynthesisTextChange(e.target.value)}
            />
          </div>

          {/* AI Cross-Check Feedback Box */}
          {aiFeedback && (
            <div className={styles.feedbackCard}>
              <div className={styles.feedbackHeader}>
                <div className={styles.feedbackAvatarIcon}>
                  <RobotAvatar variant={agentPrefs.appearance} size={32} />
                </div>
                <strong className="cyan-neon-text">
                  {agentPrefs.avatarName.toUpperCase()} ({agentPrefs.toneName.toUpperCase()} TONE) REASONING AUDIT:
                </strong>
              </div>
              <p className={styles.feedbackText}>{aiFeedback}</p>
            </div>
          )}

          <div className={styles.actionRow}>
            <button
              onClick={handleCrossCheckSynthesis}
              className={`btn-primary-cyan ${styles.auditBtn}`}
              disabled={loading || !synthesisText.trim()}
            >
              {loading
                ? `${agentPrefs.avatarName.toUpperCase()} IS ANALYZING CASEFILE...`
                : `🔍 AUDIT REASONING WITH ${agentPrefs.avatarName.toUpperCase()} (${agentPrefs.toneName.toUpperCase()})`}
            </button>

            <button onClick={handleCompleteModule} className={`btn-primary-pink ${styles.completeBtn}`}>
              COMPLETE MODULE &amp; VIEW REVIEW →
            </button>
          </div>
        </aside>

        {/* Right Interactive Concept Map Canvas using shared component */}
        <ConceptMapCanvas moduleId={moduleId} stageTitle="synthesise" />
      </div>

      {/* Bottom Stage Navigation Bar */}
      <footer className={styles.stageNavBar}>
        <button
          onClick={() => router.push(`/module/${moduleId}/familiarise`)}
          className={styles.stageStep}
        >
          01 familiarise
        </button>
        <button
          onClick={() => router.push(`/module/${moduleId}/conceptualise`)}
          className={styles.stageStep}
        >
          02 conceptualise
        </button>
        <button
          onClick={() => router.push(`/module/${moduleId}/inquire`)}
          className={styles.stageStep}
        >
          03 inquire + evaluate
        </button>
        <button
          onClick={() => router.push(`/module/${moduleId}/synthesise`)}
          className={`${styles.stageStep} ${styles.stageStepActive}`}
        >
          04 synthesise
        </button>
      </footer>

      {/* Stage Intro Modal */}
      {showIntroModal && (
        <div className={styles.modalBackdrop}>
          <div
            className="glass-card-glow"
            style={{ padding: '36px', maxWidth: '540px', width: '90%', textAlign: 'center' }}
          >
            <h3
              className="cyan-neon-text"
              style={{ fontFamily: 'var(--font-orbitron)', marginBottom: '16px', fontSize: '1.2rem' }}
            >
              📝 SYNTHESISE CASEFILE DISCLOSURE
            </h3>
            <p className={styles.introModalText} style={{ marginBottom: '16px' }}>
              Reflect on everything you learnt. Write your synthesis, and trigger the AI cross-check to evaluate
              missing links or unaddressed arguments. You can also build and link concept nodes on the right.
            </p>
            <div
              style={{
                background: 'rgba(7, 11, 26, 0.7)',
                border: '1px solid var(--accent-magenta)',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'left',
                fontSize: '0.88rem',
                color: '#D9DFF7',
                lineHeight: '1.5',
              }}
            >
              <strong style={{ color: 'var(--accent-magenta)', display: 'block', marginBottom: '8px' }}>
                ⚠️ Mandatory Socratic Peer Disclosure:
              </strong>
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}>
                  <strong>Socratic Cross-Checking:</strong> The AI agent (Aria) checks your synthesis against
                  earlier evidence and concept nodes to question unaddressed arguments.
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <strong>Reasoning Test:</strong> Aria presents questions rather than factual corrections.
                </li>
                <li>
                  <strong>No Verified Facts:</strong> Do not treat agent questions or statements as verified facts.
                </li>
              </ul>
            </div>
            <button
              onClick={() => setShowIntroModal(false)}
              className="btn-primary-cyan"
              style={{ marginTop: '24px', padding: '12px 36px', fontWeight: 'bold' }}
            >
              UNDERSTOOD &amp; START
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
