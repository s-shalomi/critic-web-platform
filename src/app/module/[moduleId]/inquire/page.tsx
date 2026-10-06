'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './inquire.module.css';

import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';
import ConceptMapCanvas from '@/shared/components/ConceptMapCanvas/ConceptMapCanvas';

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
  const [showIntroModal, setShowIntroModal] = useState<boolean>(true);

  // Evidence notes count for non-blocking AI nudge
  const [notesCount, setNotesCount] = useState<number>(0);
  const [showNudge, setShowNudge] = useState<boolean>(true);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatKey = getStudentStorageKey('critic_chat', moduleId);
    const notesKey = getStudentStorageKey('critic_notes', moduleId);

    reportStudentProgress('inquire');

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText;
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
        isDevilsAdvocate || isHighConfidence || shouldTriggerRandomly ? 'DevilsAdvocate' : 'Socratic';

      const res = await fetch(`/api/modules/${moduleId}/inquire/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages,
          userMessage: userText,
          mode: effectiveMode,
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
            <strong>Familiarise</strong> stage yet! Gathering notes helps Aria cross-reference your reasoning.
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
        {/* Left Interactive Chat Panel */}
        <aside className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div className={styles.chatTitleGroup}>
              <h2
                className="cyan-neon-text"
                style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.2rem' }}
              >
                SOCRATIC INQUIRY
              </h2>
              <button
                onClick={() => setIsDevilsAdvocate(!isDevilsAdvocate)}
                className={`${styles.devilsBtn} ${isDevilsAdvocate ? styles.devilsBtnActive : ''}`}
                title="Toggle Devil's Advocate Mode"
              >
                {isDevilsAdvocate ? "😈 Devil's Advocate Active" : "😈 Enable Devil's Advocate"}
              </button>
            </div>
          </div>

          <div className={styles.messagesList}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.messageRow} ${
                  m.sender === 'student' ? styles.studentRow : styles.agentRow
                }`}
              >
                {m.sender === 'agent' && (
                  <div className={styles.agentAvatarIcon}>
                    <div className={styles.robotHeadSmall} />
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
                  <p>{m.text}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className={`${styles.messageRow} ${styles.agentRow}`}>
                <div className={styles.agentAvatarIcon}>
                  <div className={styles.robotHeadSmall} />
                </div>
                <div className={styles.loadingBubble}>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.loadingText}>Aria is analyzing reasoning...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className={styles.inputContainer}>
            <div className={styles.inputBox}>
              <input
                type="text"
                placeholder="What would you like to know? (Challenge claims or ask questions)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className={styles.chatInput}
                disabled={loading}
              />
              <div className={styles.inputActions}>
                <button type="button" className={styles.iconBtn} title="Upload Evidence Image">
                  📷
                </button>
                <button type="button" className={styles.iconBtn} title="Insert Code Snippet">
                  &lt;&gt;
                </button>
                <button type="button" className={styles.iconBtn} title="Voice Input">
                  🎤
                </button>
                <button
                  type="submit"
                  className={styles.sendBtn}
                  disabled={loading || !inputText.trim()}
                  title="Send Message"
                >
                  ↑
                </button>
              </div>
            </div>
          </form>
        </aside>

        {/* Right Interactive Concept Map Canvas using shared component */}
        <ConceptMapCanvas moduleId={moduleId} stageTitle="inquire + evaluate" />
      </div>

      {/* Stage Navigation Bar */}
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
          className={`${styles.stageStep} ${styles.stageStepActive}`}
        >
          03 inquire + evaluate
        </button>
        <button
          onClick={() => router.push(`/module/${moduleId}/synthesise`)}
          className={styles.stageStep}
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
              ❓ INQUIRE &amp; EVALUATE DISCLOSURE
            </h3>
            <p className={styles.introModalText} style={{ marginBottom: '16px' }}>
              Interrogate topic material, question assumptions, seek alternative viewpoints, and assess the
              credibility of evidence. You can also build and link concept nodes on the right.
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
                  <strong>Socratic Questioning &amp; Devil&apos;s Advocate:</strong> Aria acts as a Socratic peer
                  and will challenge your assumptions with counter-perspectives.
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <strong>Reasoning Test:</strong> Aria may take positions it does not &quot;believe&quot; to
                  test your evidence evaluation.
                </li>
                <li>
                  <strong>No Verified Facts:</strong> Do not treat agent statements as verified facts.
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
