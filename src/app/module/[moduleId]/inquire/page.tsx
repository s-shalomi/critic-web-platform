'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './inquire.module.css';

import {
  getStudentStorageKey,
  hasSeenModuleDisclosure,
  markModuleDisclosureSeen,
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
    const currentPrefs = getStoredAgentPreferences();
    setAgentPrefs(currentPrefs);

    // Show mandatory AI disclosure automatically once when the student first enters the module
    if (!hasSeenModuleDisclosure(moduleId)) {
      setShowHelpModal(true);
      markModuleDisclosureSeen(moduleId);
    }

    reportStudentProgress('inquire');

    const handleFocus = () => {
      const updated = getStoredAgentPreferences();
      setAgentPrefs(updated);
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].id === 'msg-1') {
          return [{ ...prev[0], text: getStageOpener('inquire', updated.toneName) }];
        }
        return prev;
      });
    };
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

    // 1. Load chat history
    const localChat = localStorage.getItem(chatKey);
    if (localChat) {
      try {
        const parsed = JSON.parse(localChat);
        if (Array.isArray(parsed) && parsed.length === 1 && parsed[0].id === 'msg-1') {
          parsed[0].text = getStageOpener('inquire', currentPrefs.toneName);
        }
        setMessages(parsed);
      } catch (e) {
        console.error(e);
      }
    } else {
      fetch(`/api/modules/${moduleId}/inquire`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages && Array.isArray(data.messages)) {
            const initialized = data.messages.map((m: ChatMessage) =>
              m.id === 'msg-1'
                ? { ...m, text: getStageOpener('inquire', currentPrefs.toneName) }
                : m
            );
            setMessages(initialized);
          }
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

  const sendInquireTurn = async (userText: string, baseHistory: ChatMessage[]) => {
    setLoading(true);

    try {
      // Gather client-side notes, conceptNodes, and conceptLinks for full context snapshot
      const notesKey = getStudentStorageKey('critic_notes', moduleId);
      const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
      const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);
      let localNotes: any[] = [];
      let localNodes: any[] = [];
      let localLinks: any[] = [];
      try {
        localNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        localNodes = JSON.parse(localStorage.getItem(nodesKey) || '[]');
        localLinks = JSON.parse(localStorage.getItem(linksKey) || '[]');
      } catch (e) {
        /* ignore parse error */
      }

      const highConfidenceRegex =
        /\b(definitely|obviously|clearly|always|never|proves|fake|hoax|certainly|guaranteed|undeniable|true|false|100%|without a doubt|everyone knows)\b/i;
      const hasEvidenceKeywords =
        /\b(source|article|post|study|data|according to|author|evidence|quote|measured|statistic|research)\b/i.test(
          userText
        );
      const isShortOrUnsupported =
        userText.split(/\s+/).length < 30 ||
        !hasEvidenceKeywords ||
        (localNotes.length === 0 && notesCount === 0);
      const isHighConfidenceLowEvidence =
        highConfidenceRegex.test(userText) && isShortOrUnsupported;
      const shouldTriggerRandomly = Math.random() < 0.3;

      const hasMinimalPriorActivity =
        notesCount === 0 &&
        (!Array.isArray(localNotes) || localNotes.length === 0) &&
        (!Array.isArray(localNodes) || localNodes.length === 0);

      const effectiveMode =
        isDevilsAdvocate ||
        agentPrefs.toneId === 'devils_advocate' ||
        isHighConfidenceLowEvidence ||
        (!hasMinimalPriorActivity && shouldTriggerRandomly)
          ? 'DevilsAdvocate'
          : hasMinimalPriorActivity
          ? 'Scaffolding'
          : 'Socratic';

      const res = await fetch(`/api/modules/${moduleId}/inquire/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: baseHistory,
          userMessage: userText,
          mode: effectiveMode,
          notes: Array.isArray(localNotes) ? localNotes : [],
          conceptNodes: Array.isArray(localNodes) ? localNodes : [],
          conceptLinks: Array.isArray(localLinks) ? localLinks : [],
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
          text: '⚠️ AI service is temporarily busy. Please click Retry to resend your message.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'student',
      text: userText,
    };

    const historyBeforeTurn = [...messages];
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    await sendInquireTurn(userText, historyBeforeTurn);
  };

  const handleRetryLastTurn = async () => {
    if (loading) return;
    const lastStudentIdx = [...messages]
      .map((m, i) => ({ sender: m.sender, i }))
      .reverse()
      .find((x) => x.sender === 'student')?.i;
    if (lastStudentIdx === undefined) return;

    const lastStudentMsg = messages[lastStudentIdx];
    const historyUpToStudent = messages.slice(0, lastStudentIdx);
    const cleanedMessages = messages.slice(0, lastStudentIdx + 1);
    setMessages(cleanedMessages);
    await sendInquireTurn(lastStudentMsg.text, historyUpToStudent);
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
                    {m.sender === 'agent' && m.text.includes('⚠️') && (
                      <button
                        type="button"
                        onClick={handleRetryLastTurn}
                        disabled={loading}
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
                        ↻ Retry
                      </button>
                    )}
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
          {/* Top-Right Action Bar (AI Disclosure, Tutorial & Help) */}
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
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.5" stroke="#EAF6FF" strokeWidth="1.8" />
                <polygon points="10,8.5 16,12 10,15.5" fill="#EAF6FF" />
              </svg>
              <span>Tutorial</span>
            </button>

            <button
              type="button"
              className={styles.helpCircleBtn}
              aria-label="Help"
              title="Help"
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

      {/* Mandatory AI Disclosure Modal */}
      {showHelpModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowHelpModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowHelpModal(false)}
              className={styles.modalCloseBtn}
              aria-label="Close disclosure"
            >
              ✕
            </button>
            <h2 className={styles.modalTitle}>AI Agent Disclosure</h2>
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
            <button onClick={() => setShowHelpModal(false)} className={styles.modalPrimaryBtn}>
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
