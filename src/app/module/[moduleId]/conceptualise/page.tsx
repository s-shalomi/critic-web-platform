'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './conceptualise.module.css';

import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';

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

interface Source {
  id: string;
  topicId: string;
  title: string;
  content: {
    type: string;
    authorName?: string;
    text: string;
    comments?: Array<{ author: string; text: string }>;
  };
}

interface Note {
  id: string;
  sourceId: string;
  highlightedText: string;
  noteText: string;
  convertedToNode: boolean;
}

export default function ConceptualiseStagePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  // Concept Canvas State
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [links, setLinks] = useState<ConceptLink[]>([]);
  const [showIntroModal, setShowIntroModal] = useState<boolean>(true);
  const [agentSpeech, setAgentSpeech] = useState<string | null>(null);

  // Left Sources & Notes State
  const [sources, setSources] = useState<Source[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [pinnedNoteId, setPinnedNoteId] = useState<string | null>(null);

  // Node Controls & Tools State
  const [activeTool, setActiveTool] = useState<'pan' | 'add_node' | 'link'>('pan');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editNodeText, setEditNodeText] = useState<string>('');
  const [linkSourceNodeId, setLinkSourceNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showAddNodeModal, setShowAddNodeModal] = useState<boolean>(false);
  const [newNodeText, setNewNodeText] = useState<string>('');

  // Physics Drag State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);

    // Inform teacher portal this student is on the Conceptualise stage
    reportStudentProgress('conceptualise');

    // 1. Fetch Sources with live syncing
    const fetchSources = () => {
      fetch('/api/topics/climate-change/sources')
        .then((res) => res.json())
        .then((data) => {
          if (data.sources) setSources(data.sources);
        })
        .catch((err) => console.error('Error fetching sources:', err));
    };

    fetchSources();
    const sourcesInterval = setInterval(fetchSources, 4000);
    window.addEventListener('focus', fetchSources);

    // 2. Fetch Notes
    const localSavedNotes = localStorage.getItem(notesKey);
    if (localSavedNotes) {
      try { setNotes(JSON.parse(localSavedNotes)); } catch (e) { console.error(e); }
    }
    fetch(`/api/modules/${moduleId}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes && data.notes.length > 0) setNotes(data.notes);
      });

    // 3. Fetch Canvas Nodes & Links
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
          localStorage.setItem(nodesKey, JSON.stringify(data.nodes));
          localStorage.setItem(linksKey, JSON.stringify(cleanLinks));
        }
      });

    return () => {
      clearInterval(sourcesInterval);
      window.removeEventListener('focus', fetchSources);
    };
  }, [moduleId]);

  const saveCanvasState = (updatedNodes: ConceptNode[], updatedLinks: ConceptLink[]) => {
    const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);

    // CRITICAL: Filter out any links whose fromNode or toNode does not exist in updatedNodes
    const validNodeIds = new Set(updatedNodes.map((n) => n.id));
    const cleanedLinks = updatedLinks.filter(
      (l) => validNodeIds.has(l.fromNodeId) && validNodeIds.has(l.toNodeId)
    );

    // Recompute linkCount dynamically for each node based on surviving links
    const nodesWithAccurateCount = updatedNodes.map((n) => ({
      ...n,
      linkCount: cleanedLinks.filter(
        (l) => l.fromNodeId === n.id || l.toNodeId === n.id
      ).length,
    }));

    setNodes(nodesWithAccurateCount);
    setLinks(cleanedLinks);
    localStorage.setItem(nodesKey, JSON.stringify(nodesWithAccurateCount));
    localStorage.setItem(linksKey, JSON.stringify(cleanedLinks));
  };

  const playLinkAudioSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio fallback
    }
  };

  const handleAddNode = async () => {
    if (!newNodeText.trim()) return;
    const posX = 180 + Math.random() * 200;
    const posY = 120 + Math.random() * 180;

    try {
      const res = await fetch(`/api/modules/${moduleId}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNodeText, positionX: posX, positionY: posY }),
      });
      const data = await res.json();

      if (data.success && data.node) {
        const updated = [...nodes, { ...data.node, linkCount: 0 }];
        saveCanvasState(updated, links);
        setNewNodeText('');
        setShowAddNodeModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNodeText = async (nodeId: string) => {
    if (!editNodeText.trim()) return;
    try {
      await fetch(`/api/concepts/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editNodeText }),
      });

      const updated = nodes.map((n) => (n.id === nodeId ? { ...n, text: editNodeText } : n));
      saveCanvasState(updated, links);
      setEditingNodeId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    // 1. Immediately remove node and clean attached links optimistically
    const targetNode = nodes.find((n) => n.id === nodeId);
    const updatedNodes = nodes.filter((n) => n.id !== nodeId);
    const updatedLinks = links.filter((l) => l.fromNodeId !== nodeId && l.toNodeId !== nodeId);
    saveCanvasState(updatedNodes, updatedLinks);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);

    // 2. Revert note convertedToNode on note in state and localStorage
    const sourceNoteId = targetNode?.sourceNoteId;
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    const updatedNotes = notes.map((note) => {
      if (
        (sourceNoteId && note.id === sourceNoteId) ||
        (!sourceNoteId && targetNode && (note.noteText === targetNode.text || note.highlightedText === targetNode.text))
      ) {
        return { ...note, convertedToNode: false };
      }
      return note;
    });
    setNotes(updatedNotes);
    localStorage.setItem(notesKey, JSON.stringify(updatedNotes));

    // 3. Fire-and-forget sync to server
    try {
      await fetch(`/api/concepts/${nodeId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error syncing node deletion with server:', err);
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
            playLinkAudioSound();
            const updatedLinks = [...links, data.link];
            const updatedNodes = nodes.map((n) => {
              if (n.id === linkSourceNodeId || n.id === nodeId) {
                return { ...n, linkCount: (n.linkCount || 0) + 1 };
              }
              return n;
            });
            saveCanvasState(updatedNodes, updatedLinks);
          }
        } finally {
          setLinkSourceNodeId(null);
        }
      }
    } else {
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      } else {
        setSelectedNodeId(nodeId);
      }
    }
  };

  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    if (activeTool === 'link') return;
    e.stopPropagation();
    setDraggingNodeId(nodeId);

    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      dragOffsetRef.current = {
        x: e.clientX - targetNode.positionX,
        y: e.clientY - targetNode.positionY,
      };
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;

    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, positionX: newX, positionY: newY } : n))
    );
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

  const handleAgentClick = async () => {
    try {
      const hintKey = getStudentStorageKey('critic_hints', moduleId);
      const current = parseInt(localStorage.getItem(hintKey) || '0', 10);
      localStorage.setItem(hintKey, String(current + 1));

      const res = await fetch(`/api/modules/${moduleId}/agent/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'conceptualise' }),
      });
      const data = await res.json();
      if (data.hint) setAgentSpeech(data.hint);
    } catch (err) {
      setAgentSpeech('How does this concept connect to the evidence you highlighted earlier?');
    }
  };

  /**
   * Helper to render source text with inline highlights & hover tooltips in left panel
   */
  const renderHighlightedText = (sourceId: string, fullText: string) => {
    const sNotes = notes.filter((n) => n.sourceId === sourceId);
    if (!sNotes || sNotes.length === 0) return fullText;

    let parts: Array<{ text: string; note?: Note }> = [{ text: fullText }];

    sNotes.forEach((note) => {
      const nextParts: Array<{ text: string; note?: Note }> = [];
      parts.forEach((part) => {
        if (part.note) {
          nextParts.push(part);
        } else {
          const splitTexts = part.text.split(note.highlightedText);
          splitTexts.forEach((st, idx) => {
            if (st) nextParts.push({ text: st });
            if (idx < splitTexts.length - 1) {
              nextParts.push({ text: note.highlightedText, note });
            }
          });
        }
      });
      parts = nextParts;
    });

    return parts.map((part, index) => {
      if (!part.note) return <span key={index}>{part.text}</span>;

      const n = part.note;
      const isHovered = hoveredNoteId === n.id;
      const isPinned = pinnedNoteId === n.id;
      const isVisible = isHovered || isPinned;

      return (
        <span
          key={index}
          className={`${styles.highlightedSpan} ${isPinned ? styles.pinnedSpan : ''}`}
          onMouseEnter={() => setHoveredNoteId(n.id)}
          onMouseLeave={() => setHoveredNoteId(null)}
          onClick={(e) => {
            e.stopPropagation();
            if (isPinned) {
              setPinnedNoteId(null);
              setHoveredNoteId(null);
            } else {
              setPinnedNoteId(n.id);
            }
          }}
        >
          {part.text}

          {isVisible && (
            <span className={styles.hoverTooltip} onClick={(e) => e.stopPropagation()}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipLabel}>
                  NOTE {isPinned ? '📌 (PINNED)' : ''}
                </span>
              </div>
              <p className={styles.tooltipNoteText}>{n.noteText}</p>
            </span>
          )}
        </span>
      );
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => router.push('/dashboard')} className={styles.backBtn}>
          ← Climate Change
        </button>
      </header>

      {/* Main Workspace Split */}
      <div className={styles.workspace}>
        {/* Left Horizontal Carousel Sources Reference Panel */}
        <aside className={styles.leftSourcePanel}>
          <div className={styles.sourcePanelHeader}>
            <span className={styles.panelTitle}>EVIDENCE SOURCES (SCROLL HORIZONTALLY →)</span>
          </div>

          <div className={styles.horizontalSourcesCarousel}>
            {sources.map((src) => (
              <div key={src.id} className={styles.carouselSourceCard}>
                <div className={styles.sourceCardBadge}>{src.title}</div>
                {src.content.authorName && (
                  <div className={styles.authorHeader}>
                    <div className={styles.authorAvatar} />
                    <span className={styles.authorName}>{src.content.authorName}</span>
                  </div>
                )}
                <div className={styles.sourceText}>
                  {renderHighlightedText(src.id, src.content.text)}

                  {src.content.comments && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border-slate-50)', paddingTop: '10px' }}>
                      <h5 style={{ fontFamily: 'var(--font-orbitron)', fontSize: '0.8rem', marginBottom: '6px' }}>Comments</h5>
                      {src.content.comments.map((c, i) => (
                        <div key={i} style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
                          <strong className="cyan-neon-text">{c.author}:</strong>{' '}
                          {renderHighlightedText(src.id, c.text)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Concept Map Canvas */}
        <main
          className={styles.canvasArea}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
        >
          <div className={styles.canvasHeader}>
            <h1 className={styles.stageTitle}>conceptualise</h1>
          </div>

          <div
            className={styles.canvasStage}
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
          >
            {/* SVG Connecting Links Layer */}
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

            {/* Interactive Concept Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isLinkSource = linkSourceNodeId === node.id;
              const isEditing = editingNodeId === node.id;

              return (
                <div
                  key={node.id}
                  className={`${styles.conceptNodeCircle} ${isSelected ? styles.selectedNode : ''} ${activeTool === 'link' && isLinkSource ? styles.linkSourceNode : ''}`}
                  style={{
                    left: `${node.positionX}px`,
                    top: `${node.positionY}px`,
                    width: '100px',
                    height: '100px',
                  }}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingNodeId(node.id);
                    setEditNodeText(node.text);
                  }}
                  onClick={() => handleNodeClick(node.id)}
                >
                  {isEditing ? (
                    <div className={styles.inlineEditWrapper} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editNodeText}
                        onChange={(e) => setEditNodeText(e.target.value)}
                        className={styles.inlineEditInput}
                        autoFocus
                      />
                      <div className={styles.inlineEditBtns}>
                        <button
                          onClick={() => handleUpdateNodeText(node.id)}
                          className={styles.nodeSaveBtn}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingNodeId(null)}
                          className={styles.nodeCancelBtn}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className={styles.nodeLabel}>{node.text}</span>

                      {/* Node Action Controls (Edit / Delete) */}
                      {isSelected && (
                        <div className={styles.nodeControls} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingNodeId(node.id);
                              setEditNodeText(node.text);
                            }}
                            className={styles.nodeActionBtn}
                            title="Edit label"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNode(node.id);
                            }}
                            className={styles.nodeDeleteBtn}
                            title="Delete node"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
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
              onClick={() => setActiveTool('pan')}
              className={`${styles.toolbarBtn} ${activeTool === 'pan' ? styles.activeToolBtn : ''}`}
              title="Pan Tool"
            >
              ✋
            </button>
            <button
              onClick={() => setShowAddNodeModal(true)}
              className={styles.toolbarBtn}
              title="Create Concept Node"
            >
              ◯
            </button>
            <button
              onClick={() => {
                setActiveTool('link');
                setLinkSourceNodeId(null);
              }}
              className={`${styles.toolbarBtn} ${activeTool === 'link' ? styles.activeToolBtn : ''}`}
              title="Create Link (Click 2 nodes)"
            >
              🖋️
            </button>
          </div>
        </main>
      </div>

      {/* Socratic Agent Avatar */}
      <div className={styles.agentContainer}>
        {agentSpeech && (
          <div className={styles.speechBubble}>
            <div className={styles.speechHeader}>Aria (Socratic Peer)</div>
            <p>{agentSpeech}</p>
            <button onClick={() => setAgentSpeech(null)} className={styles.closeSpeechBtn}>✕</button>
          </div>
        )}
        <button onClick={handleAgentClick} className={styles.agentAvatarBtn} title="Click Aria for Socratic Hints">
          <div className={styles.robotHead}>
            <div className={styles.robotEyes} />
          </div>
        </button>
      </div>

      {/* Bottom Stage Navigation Bar */}
      <footer className={styles.stageNavBar}>
        <button onClick={() => router.push(`/module/${moduleId}/familiarise`)} className={styles.stageStep}>
          01 familiarise
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/conceptualise`)} className={`${styles.stageStep} ${styles.stageStepActive}`}>
          02 conceptualise
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/inquire`)} className={styles.stageStep}>
          03 inquire
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/inquire`)} className={styles.stageStep}>
          04 evaluate
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/synthesise`)} className={styles.stageStep}>
          05 synthesise
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
              placeholder="e.g. key concept / arctic deep freeze"
              value={newNodeText}
              onChange={(e) => setNewNodeText(e.target.value)}
              className={styles.modalInput}
              required
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowAddNodeModal(false)} className={styles.cancelBtn}>
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
          <div className="glass-card-glow" style={{ padding: '36px', maxWidth: '480px', width: '90%', textAlign: 'center' }}>
            <p className={styles.introModalText}>
              create nodes with the concepts you identified. link these concepts together.
            </p>
            <button
              onClick={() => setShowIntroModal(false)}
              className="btn-primary-cyan"
              style={{ marginTop: '24px', padding: '10px 32px' }}
            >
              ok
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
