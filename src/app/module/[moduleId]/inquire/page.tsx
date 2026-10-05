'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './inquire.module.css';

import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';

interface ChatMessage {
  id: string;
  sender: 'student' | 'agent';
  text: string;
  messageType?: 'chat' | 'devils_advocate' | 'hint';
}

interface ConceptNode {
  id: string;
  text: string;
  positionX: number;
  positionY: number;
  sourceNoteId?: string;
  linkCount?: number;
}

interface ConceptLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
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

  // Concept Map & Nudge Reference State
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [links, setLinks] = useState<ConceptLink[]>([]);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [showNudge, setShowNudge] = useState<boolean>(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatKey = getStudentStorageKey('critic_chat', moduleId);
    const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);
    const notesKey = getStudentStorageKey('critic_notes', moduleId);

    // Inform teacher portal this student is on the Inquire stage
    reportStudentProgress('inquire');

    // 0. Check student evidence notes count for AI Nudge
    const localNotesStr = localStorage.getItem(notesKey);
    if (localNotesStr) {
      try { setNotesCount(JSON.parse(localNotesStr).length); } catch (e) { console.error(e); }
    } else {
      fetch(`/api/modules/${moduleId}/notes`)
        .then((res) => res.json())
        .then((data) => {
          if (data.notes) setNotesCount(data.notes.length);
        });
    }

    // 1. Fetch Chat History from local storage or server
    const localChat = localStorage.getItem(chatKey);
    if (localChat) {
      try { setMessages(JSON.parse(localChat)); } catch (e) { console.error(e); }
    } else {
      fetch(`/api/modules/${moduleId}/inquire`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages) setMessages(data.messages);
        });
    }

    // 2. Fetch Concept Map Nodes for right panel reference
    const savedNodes = localStorage.getItem(nodesKey);
    const savedLinks = localStorage.getItem(linksKey);

    let initialNodes: ConceptNode[] = [];
    if (savedNodes) {
      try {
        initialNodes = JSON.parse(savedNodes);
        setNodes(initialNodes);
      } catch (e) { console.error(e); }
    }
    if (savedLinks) {
      try {
        const parsedLinks: ConceptLink[] = JSON.parse(savedLinks);
        const validIds = new Set(initialNodes.map((n) => n.id));
        const filteredLinks = initialNodes.length > 0
          ? parsedLinks.filter((l) => validIds.has(l.fromNodeId) && validIds.has(l.toNodeId))
          : parsedLinks;
        setLinks(filteredLinks);
      } catch (e) { console.error(e); }
    }

    fetch(`/api/modules/${moduleId}/conceptualise`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && data.links && (!savedNodes || initialNodes.length === 0)) {
          const validIds = new Set(data.nodes.map((n: ConceptNode) => n.id));
          const cleanLinks = data.links.filter(
            (l: ConceptLink) => validIds.has(l.fromNodeId) && validIds.has(l.toNodeId)
          );
          setNodes(data.nodes);
          setLinks(cleanLinks);
        }
      });
  }, [moduleId]);

  // Persist student-scoped chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const chatKey = getStudentStorageKey('critic_chat', moduleId);
      localStorage.setItem(chatKey, JSON.stringify(messages));
    }
  }, [messages, moduleId]);

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
      // Devil's Advocate mode: manual toggle OR random (~30% chance) OR high-confidence assertion (per requirements.md)
      const highConfidenceRegex = /\b(definitely|obviously|clearly|always|never|proves|fake|hoax|certainly|guaranteed|undeniable|true|false)\b/i;
      const isHighConfidence = highConfidenceRegex.test(userText);
      const shouldTriggerRandomly = Math.random() < 0.3;
      const effectiveMode = isDevilsAdvocate || isHighConfidence || shouldTriggerRandomly ? 'DevilsAdvocate' : 'Socratic';

      const res = await fetch(`/api/modules/${moduleId}/inquire/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
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
        <div style={{ background: 'rgba(55, 243, 255, 0.12)', borderBottom: '1px solid var(--primary-cyan)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-light)', fontSize: '0.9rem' }}>
          <span>
            💡 <strong>AI Learning Nudge:</strong> You haven&apos;t gathered evidence notes in the <strong>Familiarise</strong> stage yet! Gathering notes helps Aria cross-reference your reasoning. You can continue exploring here or return to Familiarise anytime.
          </span>
          <button
            onClick={() => setShowNudge(false)}
            style={{ background: 'transparent', border: 'none', color: 'var(--primary-cyan)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', marginLeft: '16px' }}
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
              <h2 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.2rem' }}>
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
                <button type="button" className={styles.iconBtn} title="Upload Evidence Image">📷</button>
                <button type="button" className={styles.iconBtn} title="Insert Code Snippet">&lt;&gt;</button>
                <button type="button" className={styles.iconBtn} title="Voice Input">🎤</button>
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

        {/* Right Concept Map Reference Canvas */}
        <main className={styles.rightCanvasPanel}>
          <div className={styles.canvasHeader}>
            <h1 className={styles.stageTitle}>inquire + evaluate</h1>
          </div>

          <div className={styles.canvasPreviewStage}>
            <svg className={styles.svgOverlay}>
              {links.map((link) => {
                const fromNode = nodes.find((n) => n.id === link.fromNodeId);
                const toNode = nodes.find((n) => n.id === link.toNodeId);
                if (!fromNode || !toNode) return null;

                return (
                  <line
                    key={link.id}
                    x1={fromNode.positionX + 50}
                    y1={fromNode.positionY + 50}
                    x2={toNode.positionX + 50}
                    y2={toNode.positionY + 50}
                    stroke="#37F3FF"
                    strokeWidth="3"
                    className={styles.svgLineGlow}
                  />
                );
              })}
            </svg>

            {nodes.map((node) => {
              return (
                <div
                  key={node.id}
                  className={styles.conceptNodeCircle}
                  style={{
                    left: `${node.positionX}px`,
                    top: `${node.positionY}px`,
                    width: '100px',
                    height: '100px',
                  }}
                >
                  <span className={styles.nodeLabel}>{node.text}</span>
                </div>
              );
            })}
          </div>

          {/* Far Right Control Toolbar */}
          <div className={styles.canvasToolbar}>
            <button className={styles.toolbarBtn} title="Zoom In">🔍+</button>
            <button className={styles.toolbarBtn} title="Zoom Out">🔍-</button>
            <button className={`${styles.toolbarBtn} ${styles.activeToolBtn}`} title="Pan">✋</button>
            <button className={styles.toolbarBtn} title="Concept Node">◯</button>
            <button className={styles.toolbarBtn} title="Link Tool">🖋️</button>
            <button className={styles.toolbarBtn} title="Text Tool">Tᴛ</button>
          </div>
        </main>
      </div>

      {/* Stage Navigation Bar */}
      <footer className={styles.stageNavBar}>
        <button onClick={() => router.push(`/module/${moduleId}/familiarise`)} className={styles.stageStep}>
          01 familiarise
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/conceptualise`)} className={styles.stageStep}>
          02 conceptualise
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/inquire`)} className={`${styles.stageStep} ${styles.stageStepActive}`}>
          03 inquire
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/inquire`)} className={`${styles.stageStep} ${styles.stageStepActive}`}>
          04 evaluate
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/synthesise`)} className={styles.stageStep}>
          05 synthesise
        </button>
      </footer>

      {/* Stage Intro Modal */}
      {showIntroModal && (
        <div className={styles.modalBackdrop}>
          <div className="glass-card-glow" style={{ padding: '36px', maxWidth: '540px', width: '90%', textAlign: 'center' }}>
            <h3 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', marginBottom: '16px', fontSize: '1.2rem' }}>
              ❓ INQUIRE & EVALUATE DISCLOSURE
            </h3>
            <p className={styles.introModalText} style={{ marginBottom: '16px' }}>
              Interrogate topic material, question assumptions, seek alternative viewpoints, and assess the credibility of evidence.
            </p>
            <div style={{ background: 'rgba(7, 11, 26, 0.7)', border: '1px solid var(--accent-magenta)', borderRadius: '10px', padding: '16px', textAlign: 'left', fontSize: '0.88rem', color: '#D9DFF7', lineHeight: '1.5' }}>
              <strong style={{ color: 'var(--accent-magenta)', display: 'block', marginBottom: '8px' }}>⚠️ Mandatory Socratic Peer Disclosure:</strong>
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}><strong>Socratic Questioning & Devil&apos;s Advocate:</strong> Aria acts as a Socratic peer and will challenge your assumptions with counter-perspectives.</li>
                <li style={{ marginBottom: '6px' }}><strong>Reasoning Test:</strong> Aria may take positions it does not &quot;believe&quot; to test your evidence evaluation.</li>
                <li><strong>No Verified Facts:</strong> Do not treat agent statements as verified facts.</li>
              </ul>
            </div>
            <button
              onClick={() => setShowIntroModal(false)}
              className="btn-primary-cyan"
              style={{ marginTop: '24px', padding: '12px 36px', fontWeight: 'bold' }}
            >
              UNDERSTOOD & START
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
