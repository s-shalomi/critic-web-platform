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

  // Concept Map State (now interactive)
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [links, setLinks] = useState<ConceptLink[]>([]);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [showNudge, setShowNudge] = useState<boolean>(true);

  // Canvas tool state
  const [activeTool, setActiveTool] = useState<'pan' | 'add_node' | 'link'>('pan');
  const [linkSourceNodeId, setLinkSourceNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddNodeModal, setShowAddNodeModal] = useState<boolean>(false);
  const [newNodeText, setNewNodeText] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  /** Persist canvas to student-scoped localStorage and shared keys */
  const saveCanvasState = (updatedNodes: ConceptNode[], updatedLinks: ConceptLink[]) => {
    const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);

    const validNodeIds = new Set(updatedNodes.map((n) => n.id));
    const cleanedLinks = updatedLinks.filter(
      (l) => validNodeIds.has(l.fromNodeId) && validNodeIds.has(l.toNodeId)
    );
    const nodesWithCount = updatedNodes.map((n) => ({
      ...n,
      linkCount: cleanedLinks.filter((l) => l.fromNodeId === n.id || l.toNodeId === n.id).length,
    }));

    setNodes(nodesWithCount);
    setLinks(cleanedLinks);
    localStorage.setItem(nodesKey, JSON.stringify(nodesWithCount));
    localStorage.setItem(linksKey, JSON.stringify(cleanedLinks));
  };

  useEffect(() => {
    const chatKey = getStudentStorageKey('critic_chat', moduleId);
    const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);
    const notesKey = getStudentStorageKey('critic_notes', moduleId);

    reportStudentProgress('inquire');

    // 0. Check notes count for nudge
    const localNotesStr = localStorage.getItem(notesKey);
    if (localNotesStr) {
      try { setNotesCount(JSON.parse(localNotesStr).length); } catch (e) { console.error(e); }
    } else {
      fetch(`/api/modules/${moduleId}/notes`)
        .then((res) => res.json())
        .then((data) => { if (data.notes) setNotesCount(data.notes.length); });
    }

    // 1. Load chat history
    const localChat = localStorage.getItem(chatKey);
    if (localChat) {
      try { setMessages(JSON.parse(localChat)); } catch (e) { console.error(e); }
    } else {
      fetch(`/api/modules/${moduleId}/inquire`)
        .then((res) => res.json())
        .then((data) => { if (data.messages) setMessages(data.messages); });
    }

    // 2. Load concept nodes & links
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

    // Fallback to server if no local data
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
      const highConfidenceRegex = /\b(definitely|obviously|clearly|always|never|proves|fake|hoax|certainly|guaranteed|undeniable|true|false)\b/i;
      const isHighConfidence = highConfidenceRegex.test(userText);
      const shouldTriggerRandomly = Math.random() < 0.3;
      const effectiveMode = isDevilsAdvocate || isHighConfidence || shouldTriggerRandomly ? 'DevilsAdvocate' : 'Socratic';

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

  // Canvas interaction handlers
  const handleAddNode = async () => {
    if (!newNodeText.trim()) return;
    const posX = 80 + Math.random() * 300;
    const posY = 80 + Math.random() * 200;

    try {
      const res = await fetch(`/api/modules/${moduleId}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNodeText, positionX: posX, positionY: posY }),
      });
      const data = await res.json();
      if (data.success && data.node) {
        saveCanvasState([...nodes, { ...data.node, linkCount: 0 }], links);
        setNewNodeText('');
        setShowAddNodeModal(false);
        setActiveTool('pan');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNodeClick = async (nodeId: string) => {
    if (activeTool === 'link') {
      if (!linkSourceNodeId) {
        setLinkSourceNodeId(nodeId);
      } else if (linkSourceNodeId !== nodeId) {
        try {
          const res = await fetch(`/api/modules/${moduleId}/concepts/links`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromNodeId: linkSourceNodeId, toNodeId: nodeId }),
          });
          const data = await res.json();
          if (data.success && data.link) {
            saveCanvasState(nodes, [...links, data.link]);
          }
        } finally {
          setLinkSourceNodeId(null);
        }
      }
    } else {
      setSelectedNodeId(selectedNodeId === nodeId ? null : nodeId);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    const updatedNodes = nodes.filter((n) => n.id !== nodeId);
    const updatedLinks = links.filter((l) => l.fromNodeId !== nodeId && l.toNodeId !== nodeId);
    saveCanvasState(updatedNodes, updatedLinks);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    try { await fetch(`/api/concepts/${nodeId}`, { method: 'DELETE' }); } catch (err) { console.error(err); }
  };

  const handleDeleteLink = async (linkId: string) => {
    saveCanvasState(nodes, links.filter((l) => l.id !== linkId));
    try { await fetch(`/api/links/${linkId}`, { method: 'DELETE' }); } catch (err) { console.error(err); }
  };

  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    if (activeTool === 'link') return;
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      dragOffsetRef.current = { x: e.clientX - targetNode.positionX, y: e.clientY - targetNode.positionY };
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;
    setNodes((prev) => prev.map((n) =>
      n.id === draggingNodeId
        ? { ...n, positionX: e.clientX - dragOffsetRef.current.x, positionY: e.clientY - dragOffsetRef.current.y }
        : n
    ));
  };

  const handleMouseUpCanvas = () => {
    if (draggingNodeId) {
      const movedNode = nodes.find((n) => n.id === draggingNodeId);
      if (movedNode) {
        fetch(`/api/concepts/${draggingNodeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ positionX: movedNode.positionX, positionY: movedNode.positionY }),
        });
        saveCanvasState(nodes, links);
      }
      setDraggingNodeId(null);
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

        {/* Right Interactive Concept Map Canvas */}
        <main
          className={styles.rightCanvasPanel}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
        >
          <div className={styles.canvasHeader}>
            <h1 className={styles.stageTitle}>inquire + evaluate</h1>
          </div>

          <div
            className={styles.canvasPreviewStage}
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
          >
            {/* Interactive Concept Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isLinkSource = linkSourceNodeId === node.id;

              return (
                <div
                  key={node.id}
                  className={`${styles.conceptNodeCircle} ${isSelected ? styles.selectedNode : ''} ${activeTool === 'link' && isLinkSource ? styles.linkSourceNode : ''}`}
                  style={{ left: `${node.positionX}px`, top: `${node.positionY}px`, width: '100px', height: '100px' }}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  onClick={() => handleNodeClick(node.id)}
                >
                  <span className={styles.nodeLabel}>{node.text}</span>
                  {isSelected && activeTool === 'pan' && (
                    <div className={styles.nodeControls} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                        className={styles.nodeDeleteBtn}
                        title="Delete node"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* SVG Links Layer */}
            <svg className={styles.svgOverlay}>
              <rect width="100%" height="100%" fill="none" pointerEvents="none" />
              {links.map((link) => {
                const fromNode = nodes.find((n) => n.id === link.fromNodeId);
                const toNode = nodes.find((n) => n.id === link.toNodeId);
                if (!fromNode || !toNode) return null;

                const isHovered = hoveredLinkId === link.id;
                const x1 = fromNode.positionX + 50;
                const y1 = fromNode.positionY + 50;
                const x2 = toNode.positionX + 50;
                const y2 = toNode.positionY + 50;

                return (
                  <g
                    key={link.id}
                    onMouseEnter={() => setHoveredLinkId(link.id)}
                    onMouseLeave={() => setHoveredLinkId(null)}
                    onClick={(e) => { e.stopPropagation(); handleDeleteLink(link.id); }}
                    style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  >
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,0)" strokeWidth="16" pointerEvents="stroke" />
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isHovered ? '#FF4FD8' : '#37F3FF'}
                      strokeWidth={isHovered ? 4 : 3}
                      className={styles.svgLineGlow}
                      pointerEvents="stroke"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Far Right Control Toolbar */}
          <div className={styles.canvasToolbar}>
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.8))}
              className={styles.toolbarBtn}
              title="Zoom In"
            >
              🔍+
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.5))}
              className={styles.toolbarBtn}
              title="Zoom Out"
            >
              🔍-
            </button>
            <button
              onClick={() => { setActiveTool('pan'); setLinkSourceNodeId(null); }}
              className={`${styles.toolbarBtn} ${activeTool === 'pan' ? styles.activeToolBtn : ''}`}
              title="Pan Tool"
            >
              ✋
            </button>
            <button
              onClick={() => setShowAddNodeModal(true)}
              className={`${styles.toolbarBtn} ${activeTool === 'add_node' ? styles.activeToolBtn : ''}`}
              title="Create Concept Node"
            >
              ◯
            </button>
            <button
              onClick={() => { setActiveTool('link'); setLinkSourceNodeId(null); }}
              className={`${styles.toolbarBtn} ${activeTool === 'link' ? styles.activeToolBtn : ''}`}
              title="Create Link (Click 2 nodes)"
            >
              🖋️
            </button>
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
          03 inquire + evaluate
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/synthesise`)} className={styles.stageStep}>
          04 synthesise
        </button>
      </footer>

      {/* Create Node Modal */}
      {showAddNodeModal && (
        <div className={styles.modalBackdrop}>
          <div className="glass-card-glow" style={{ padding: '32px', maxWidth: '420px', width: '90%' }}>
            <h3 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', marginBottom: '16px' }}>
              CREATE CONCEPT NODE
            </h3>
            <input
              type="text"
              placeholder="e.g. key concept / argument"
              value={newNodeText}
              onChange={(e) => setNewNodeText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(7, 11, 26, 0.9)',
                border: '1px solid var(--color-accent-cyan-50)',
                borderRadius: '8px',
                color: 'var(--color-text-light)',
                fontFamily: 'var(--font-exo2)',
                fontSize: '0.95rem',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowAddNodeModal(false)} style={{ background: 'transparent', border: '1px solid var(--color-border-slate)', color: 'var(--color-text-light)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleAddNode} className="btn-primary-cyan">
                CREATE NODE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Intro Modal */}
      {showIntroModal && (
        <div className={styles.modalBackdrop}>
          <div className="glass-card-glow" style={{ padding: '36px', maxWidth: '540px', width: '90%', textAlign: 'center' }}>
            <h3 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', marginBottom: '16px', fontSize: '1.2rem' }}>
              ❓ INQUIRE &amp; EVALUATE DISCLOSURE
            </h3>
            <p className={styles.introModalText} style={{ marginBottom: '16px' }}>
              Interrogate topic material, question assumptions, seek alternative viewpoints, and assess the credibility of evidence. You can also add concept nodes to your map on the right.
            </p>
            <div style={{ background: 'rgba(7, 11, 26, 0.7)', border: '1px solid var(--accent-magenta)', borderRadius: '10px', padding: '16px', textAlign: 'left', fontSize: '0.88rem', color: '#D9DFF7', lineHeight: '1.5' }}>
              <strong style={{ color: 'var(--accent-magenta)', display: 'block', marginBottom: '8px' }}>⚠️ Mandatory Socratic Peer Disclosure:</strong>
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}><strong>Socratic Questioning &amp; Devil&apos;s Advocate:</strong> Aria acts as a Socratic peer and will challenge your assumptions with counter-perspectives.</li>
                <li style={{ marginBottom: '6px' }}><strong>Reasoning Test:</strong> Aria may take positions it does not &quot;believe&quot; to test your evidence evaluation.</li>
                <li><strong>No Verified Facts:</strong> Do not treat agent statements as verified facts.</li>
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
