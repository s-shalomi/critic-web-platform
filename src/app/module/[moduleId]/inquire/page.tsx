'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './inquire.module.css';

import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';
import ConceptMapCanvas from '@/shared/components/ConceptMapCanvas/ConceptMapCanvas';
import {
  RobotAvatar,
  getStoredAgentPreferences,
  DEFAULT_AGENT_PREFERENCES,
  ResolvedAgentPreferences,
} from '@/shared/components/RobotAvatar/RobotAvatar';

interface ChatMessage {
  id: string;
  sender: 'student' | 'agent';
  text: string;
  messageType?: 'chat' | 'devils_advocate' | 'hint';
}

export default function InquireEvaluateStagePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isDevilsAdvocate, setIsDevilsAdvocate] = useState<boolean>(false);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [agentPrefs, setAgentPrefs] = useState<ResolvedAgentPreferences>(DEFAULT_AGENT_PREFERENCES);

  // Evidence notes count for non-blocking AI nudge
  const [notesCount, setNotesCount] = useState<number>(0);
  const [showNudge, setShowNudge] = useState<boolean>(true);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatKey = getStudentStorageKey('critic_chat', moduleId);
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    setAgentPrefs(getStoredAgentPreferences());

    reportStudentProgress('inquire');

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

    // 1. Load chat history
    const localChat = localStorage.getItem(chatKey);
    if (localChat) {
      try {
        setMessages(JSON.parse(localChat));
      } catch (e) {
        console.error(e);
      }
    } else {
      fetch(`/api/modules/${moduleId}/inquire`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages) setMessages(data.messages);
        });
    }

    return () => window.removeEventListener('focus', handleFocus);
  }, [moduleId]);

  // Persist chat history
  useEffect(() => {
    if (messages.length > 0) {
      const chatKey = getStudentStorageKey('critic_chat', moduleId);
      localStorage.setItem(chatKey, JSON.stringify(messages));
    }
  }, [messages, moduleId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const submitMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'student',
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const highConfidenceRegex =
        /\b(definitely|obviously|clearly|always|never|proves|fake|hoax|certainly|guaranteed|undeniable|true|false)\b/i;
      const isHighConfidence = highConfidenceRegex.test(userText);
      const shouldTriggerRandomly = Math.random() < 0.3;
      const effectiveMode =
        isDevilsAdvocate ||
        agentPrefs.toneId === 'devils_advocate' ||
        isHighConfidence ||
        shouldTriggerRandomly
          ? 'DevilsAdvocate'
          : 'Socratic';

      const res = await fetch(`/api/modules/${moduleId}/inquire/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages,
          userMessage: userText,
          mode: effectiveMode,
          agentPersonality: `${agentPrefs.toneName} (${agentPrefs.toneDesc})`,
          avatarName: agentPrefs.avatarName,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        const agentMsg: ChatMessage = {
          id: `msg_${Date.now()}_agent`,
          sender: 'agent',
          text: data.message.text,
          messageType: data.message.messageType,
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        throw new Error('No message in response');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'agent',
          text: 'What underlying assumptions might we challenge in that claim? What evidence is needed to test it?',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMessage();
  };

  return (
    <div className={styles.container}>
      {/* Main Workspace Split */}
      <div className={styles.workspace}>
        {/* Left Interactive Socratic Inquiry Chat Panel */}
        <aside className={styles.chatPanel}>
          <div className={styles.topHeaderRow}>
            <button onClick={() => router.push('/dashboard')} className={styles.backBtn}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Climate Change</span>
            </button>
          </div>

          <div className={styles.headingRow}>
            <h1 className={styles.sidebarHeading}>Challenge Everything</h1>

            <div className={styles.agentStatusRow}>
              <span className={styles.agentTonePill}>
                <strong className={styles.agentToneName}>{agentPrefs.avatarName}</strong>
                <span className={styles.agentToneDot}>•</span>
                <span>Tone: {agentPrefs.toneName}</span>
              </span>

              <button
                type="button"
                onClick={() => setIsDevilsAdvocate(!isDevilsAdvocate)}
                className={`${styles.devilsBtn} ${isDevilsAdvocate ? styles.devilsBtnActive : ''}`}
                title="Toggle Devil's Advocate Mode"
              >
                {isDevilsAdvocate ? "Devil's Advocate: ON" : "Devil's Advocate"}
              </button>
            </div>
          </div>

          {/* Non-blocking AI Contextual Nudge Banner */}
          {notesCount === 0 && showNudge && (
            <div className={styles.nudgeBanner}>
              <span>
                💡 <strong>AI Nudge:</strong> Gathering evidence notes in{' '}
                <strong>Annotate</strong> helps {agentPrefs.avatarName} cross-reference your
                reasoning.
              </span>
              <button
                type="button"
                onClick={() => setShowNudge(false)}
                className={styles.nudgeCloseBtn}
                aria-label="Dismiss nudge"
              >
                ✕
              </button>
            </div>
          )}

          {/* Rounded Dark Slate Chat Card matching screens_v2/inquire_eval.png */}
          <div className={styles.chatCardContainer}>
            <div className={styles.messagesList}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`${styles.messageRow} ${
                    m.sender === 'student' ? styles.studentRow : styles.agentRow
                  }`}
                >
                  {m.sender === 'agent' && (
                    <div
                      className={styles.agentAvatarIcon}
                      title={`${agentPrefs.avatarName} (${agentPrefs.toneName})`}
                    >
                      <RobotAvatar variant={agentPrefs.appearance} size={46} />
                    </div>
                  )}

                  <div
                    className={`${styles.messageBubble} ${
                      m.sender === 'student'
                        ? styles.studentBubble
                        : m.messageType === 'devils_advocate'
                        ? styles.devilsAdvocateBubble
                        : styles.agentBubble
                    }`}
                  >
                    {m.messageType === 'devils_advocate' && (
                      <div className={styles.devilsTag}>DEVIL&apos;S ADVOCATE COUNTER-CLAIM</div>
                    )}
                    <p className={styles.messageText}>{m.text}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className={`${styles.messageRow} ${styles.agentRow}`}>
                  <div className={styles.agentAvatarIcon}>
                    <RobotAvatar variant={agentPrefs.appearance} size={46} />
                  </div>
                  <div className={styles.loadingBubble}>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.loadingText}>
                      {agentPrefs.avatarName} ({agentPrefs.toneName}) is thinking...
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Bottom Input Box inside the Chat Card matching screens_v2/inquire_eval.png */}
            <form onSubmit={handleSendMessage} className={styles.inputContainer}>
              <div className={styles.inputBox}>
                <textarea
                  rows={2}
                  placeholder="Challenge yourself and the material. Ask questions about your beliefs and the source credibility."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitMessage();
                    }
                  }}
                  className={styles.chatInput}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className={styles.sendBtn}
                  disabled={loading || !inputText.trim()}
                  title="Send Message"
                  aria-label="Send Message"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </aside>

        {/* Right Interactive Concept Map Canvas Area */}
        <div className={styles.rightCanvasWrapper}>
          {/* Top-Right Action Bar (Tutorial & Help) */}
          <div className={styles.topRightActions}>
            <button
              type="button"
              onClick={() => setShowTutorialModal(true)}
              className={styles.tutorialBtn}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.5" stroke="#EAF6FF" strokeWidth="1.8" />
                <polygon points="10,8.5 16,12 10,15.5" fill="#EAF6FF" />
              </svg>
              <span>Tutorial</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className={styles.helpCircleBtn}
              aria-label="About Socratic AI Peer & Disclosure"
              title="About Socratic AI Peer & Disclosure"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.5" stroke="#EAF6FF" strokeWidth="1.8" />
                <path
                  d="M9.5 9.5C9.5 8.12 10.62 7 12 7C13.38 7 14.5 8.12 14.5 9.5C14.5 10.65 13.72 11.62 12.66 11.91C12.26 12.02 12 12.38 12 12.8V13.5"
                  stroke="#EAF6FF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16.5" r="1" fill="#EAF6FF" />
              </svg>
            </button>
          </div>

          <ConceptMapCanvas moduleId={moduleId} stageTitle="inquire + evaluate" />
        </div>
      </div>

      {/* Floating Stage Navigation Dock (matching Familiarise & Conceptualise) */}
      <div className={styles.stageNavWrapper}>
        <nav className={styles.stageNavBar} aria-label="Module stages">
          <button
            type="button"
            onClick={() => router.push(`/module/${moduleId}/familiarise`)}
            className={styles.stageStep}
          >
            <span className={styles.stageCircle}>01</span>
            <span className={styles.stageLabel}>Annotate</span>
          </button>

          <button
            type="button"
            onClick={() => router.push(`/module/${moduleId}/conceptualise`)}
            className={styles.stageStep}
          >
            <span className={styles.stageCircle}>02</span>
            <span className={styles.stageLabel}>Mind Map</span>
          </button>

          <button
            type="button"
            onClick={() => router.push(`/module/${moduleId}/inquire`)}
            className={`${styles.stageStep} ${styles.stageStepActive}`}
            aria-current="step"
          >
            <span className={`${styles.stageCircle} ${styles.stageCircleActive}`}>03</span>
            <span className={styles.stageLabel}>Challenge</span>
          </button>

          <button
            type="button"
            onClick={() => router.push(`/module/${moduleId}/synthesise`)}
            className={styles.stageStep}
          >
            <span className={styles.stageCircle}>04</span>
            <span className={styles.stageLabel}>Conclude</span>
          </button>
        </nav>
      </div>

      {/* Tutorial Modal */}
      {showTutorialModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowTutorialModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowTutorialModal(false)}
              className={styles.modalCloseBtn}
              aria-label="Close tutorial"
            >
              ✕
            </button>
            <h2 className={styles.modalTitle}>Stage 03: Challenge Everything</h2>
            <p className={styles.modalLead}>
              Interrogate topic material, question assumptions, seek alternative viewpoints, and
              assess the credibility of evidence alongside your mind map.
            </p>
            <ol className={styles.tutorialStepsList}>
              <li>
                <strong>Dialogue with {agentPrefs.avatarName}:</strong> Respond to Socratic questions
                or ask your own questions in the chat box to test your reasoning.
              </li>
              <li>
                <strong>Devil&apos;s Advocate Mode:</strong> Toggle Devil&apos;s Advocate to have{' '}
                {agentPrefs.avatarName} actively challenge your claims with counter-perspectives.
              </li>
              <li>
                <strong>Refine Your Mind Map:</strong> As new insights emerge in the dialogue, add,
                edit, or connect concept nodes directly on the right canvas.
              </li>
            </ol>
            <button onClick={() => setShowTutorialModal(false)} className={styles.modalPrimaryBtn}>
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Help / Socratic AI Disclosure Modal */}
      {showHelpModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowHelpModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowHelpModal(false)}
              className={styles.modalCloseBtn}
              aria-label="Close help"
            >
              ✕
            </button>
            <h2 className={styles.modalTitle}>Inquire &amp; Evaluate Disclosure</h2>
            <p className={styles.modalLead}>
              You are chatting with <strong>{agentPrefs.avatarName}</strong> using your selected{' '}
              <strong>{agentPrefs.toneName}</strong> tone.
            </p>
            <div className={styles.disclosureBox}>
              <strong className={styles.disclosureHeading}>
                ⚠️ Mandatory Socratic Peer Disclosure:
              </strong>
              <ul className={styles.disclosureList}>
                <li>
                  <strong>Socratic Questioning &amp; Devil&apos;s Advocate:</strong>{' '}
                  {agentPrefs.avatarName} acts as a Socratic peer and will challenge your assumptions
                  with counter-perspectives.
                </li>
                <li>
                  <strong>Reasoning Test:</strong> {agentPrefs.avatarName} may take positions it does
                  not &ldquo;believe&rdquo; to test your evidence evaluation.
                </li>
                <li>
                  <strong>No Verified Facts:</strong> Do not treat agent statements as verified
                  facts.
                </li>
              </ul>
            </div>
            <button onClick={() => setShowHelpModal(false)} className={styles.modalPrimaryBtn}>
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
