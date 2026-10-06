'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './ConceptMapCanvas.module.css';
import { getStudentStorageKey } from '@/shared/utils/storage';

export interface ConceptNode {
  id: string;
  text: string;
  positionX: number;
  positionY: number;
  sourceNoteId?: string;
  linkCount?: number;
}

export function getNodeDiameter(text: string): number {
  const len = (text || '').trim().length;
  if (len <= 15) return 120;
  if (len <= 30) return 145;
  if (len <= 55) return 175;
  if (len <= 85) return 205;
  return 240;
}

export interface ConceptLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

interface Note {
  id: string;
  sourceId: string;
  highlightedText: string;
  noteText: string;
  convertedToNode: boolean;
}

interface ConceptMapCanvasProps {
  moduleId: string;
  stageTitle?: string;
  className?: string;
  style?: React.CSSProperties;
  onNodesChange?: (nodes: ConceptNode[]) => void;
}

export default function ConceptMapCanvas({
  moduleId,
  stageTitle = 'conceptualise',
  className,
  style,
  onNodesChange,
}: ConceptMapCanvasProps) {
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [links, setLinks] = useState<ConceptLink[]>([]);
  const [activeTool, setActiveTool] = useState<'pan' | 'add_node' | 'link'>('pan');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editNodeText, setEditNodeText] = useState<string>('');
  const [linkSourceNodeId, setLinkSourceNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showAddNodeModal, setShowAddNodeModal] = useState<boolean>(false);
  const [newNodeText, setNewNodeText] = useState<string>('');

  // Panning & Drag State
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasStageRef = useRef<HTMLDivElement>(null);

  const playLinkAudioSound = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  /** Persist canvas to student-scoped localStorage and clean orphaned links */
  const saveCanvasState = (updatedNodes: ConceptNode[], updatedLinks: ConceptLink[]) => {
    const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);

    const validNodeIds = new Set(updatedNodes.map((n) => n.id));
    const cleanedLinks = updatedLinks.filter(
      (l) => validNodeIds.has(l.fromNodeId) && validNodeIds.has(l.toNodeId)
    );

    const nodesWithAccurateCount = updatedNodes.map((n) => ({
      ...n,
      linkCount: cleanedLinks.filter((l) => l.fromNodeId === n.id || l.toNodeId === n.id).length,
    }));

    setNodes(nodesWithAccurateCount);
    setLinks(cleanedLinks);
    localStorage.setItem(nodesKey, JSON.stringify(nodesWithAccurateCount));
    localStorage.setItem(linksKey, JSON.stringify(cleanedLinks));

    if (onNodesChange) {
      onNodesChange(nodesWithAccurateCount);
    }
  };

  // Load Initial Nodes and Links
  useEffect(() => {
    const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);

    const loadLocalCanvas = () => {
      const savedNodes = localStorage.getItem(nodesKey);
      const savedLinks = localStorage.getItem(linksKey);

      let initialNodes: ConceptNode[] = [];
      if (savedNodes) {
        try {
          initialNodes = JSON.parse(savedNodes);
          setNodes(initialNodes);
          if (onNodesChange) onNodesChange(initialNodes);
        } catch (e) {
          console.error(e);
        }
      }

      if (savedLinks) {
        try {
          const parsedLinks: ConceptLink[] = JSON.parse(savedLinks);
          if (initialNodes.length > 0) {
            const validIds = new Set(initialNodes.map((n) => n.id));
            setLinks(parsedLinks.filter((l) => validIds.has(l.fromNodeId) && validIds.has(l.toNodeId)));
          } else {
            setLinks(parsedLinks);
          }
        } catch (e) {
          console.error(e);
        }
      }

      return initialNodes;
    };

    const initialNodes = loadLocalCanvas();

    // Fetch from server
    fetch(`/api/modules/${moduleId}/conceptualise`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && data.links) {
          const validIds = new Set(data.nodes.map((n: ConceptNode) => n.id));
          const cleanLinks = data.links.filter(
            (l: ConceptLink) => validIds.has(l.fromNodeId) && validIds.has(l.toNodeId)
          );

          if (!localStorage.getItem(nodesKey) || initialNodes.length === 0) {
            setNodes(data.nodes);
            setLinks(cleanLinks);
            localStorage.setItem(nodesKey, JSON.stringify(data.nodes));
            localStorage.setItem(linksKey, JSON.stringify(cleanLinks));
            if (onNodesChange) onNodesChange(data.nodes);
          } else {
            // Clean up any stale links in current state
            setLinks((currentLinks) => {
              const localValidIds = new Set(initialNodes.map((n) => n.id));
              return currentLinks.filter(
                (l) => localValidIds.has(l.fromNodeId) && localValidIds.has(l.toNodeId)
              );
            });
          }
        }
      })
      .catch((err) => console.error('Error fetching conceptualise data:', err));

    const handleFocus = () => {
      loadLocalCanvas();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [moduleId]);

  // Handle Add Concept Node
  const handleAddNode = async () => {
    if (!newNodeText.trim()) return;

    // Center new node in currently visible viewport
    const canvasWidth = canvasStageRef.current?.clientWidth || 800;
    const canvasHeight = canvasStageRef.current?.clientHeight || 600;
    const centerX = (canvasWidth / 2 - panOffset.x) / zoomLevel;
    const centerY = (canvasHeight / 2 - panOffset.y) / zoomLevel;
    const posX = Math.round(centerX - 60 + (Math.random() * 60 - 30));
    const posY = Math.round(centerY - 60 + (Math.random() * 60 - 30));

    try {
      const res = await fetch(`/api/modules/${moduleId}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNodeText.trim(), positionX: posX, positionY: posY }),
      });
      const data = await res.json();

      if (data.success && data.node) {
        const updated = [...nodes, { ...data.node, linkCount: 0 }];
        saveCanvasState(updated, links);
        setNewNodeText('');
        setShowAddNodeModal(false);
        setActiveTool('pan');
      }
    } catch (err) {
      console.error('Error creating concept node:', err);
    }
  };

  // Handle Update Concept Node Text
  const handleUpdateNodeText = async (nodeId: string) => {
    if (!editNodeText.trim()) return;
    try {
      await fetch(`/api/concepts/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editNodeText.trim() }),
      });

      const updated = nodes.map((n) => (n.id === nodeId ? { ...n, text: editNodeText.trim() } : n));
      saveCanvasState(updated, links);
      setEditingNodeId(null);
    } catch (err) {
      console.error('Error updating node text:', err);
    }
  };

  // Handle Delete Concept Node
  const handleDeleteNode = async (nodeId: string) => {
    const targetNode = nodes.find((n) => n.id === nodeId);
    const updatedNodes = nodes.filter((n) => n.id !== nodeId);
    const updatedLinks = links.filter((l) => l.fromNodeId !== nodeId && l.toNodeId !== nodeId);
    saveCanvasState(updatedNodes, updatedLinks);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);

    // Revert note convertedToNode on note in state and localStorage
    const sourceNoteId = targetNode?.sourceNoteId;
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    const rawNotes = localStorage.getItem(notesKey);
    if (rawNotes) {
      try {
        const parsedNotes: Note[] = JSON.parse(rawNotes);
        const updatedNotes = parsedNotes.map((note) => {
          if (
            (sourceNoteId && note.id === sourceNoteId) ||
            (!sourceNoteId &&
              targetNode &&
              (note.noteText === targetNode.text || note.highlightedText === targetNode.text))
          ) {
            return { ...note, convertedToNode: false };
          }
          return note;
        });
        localStorage.setItem(notesKey, JSON.stringify(updatedNotes));
      } catch (e) {
        console.error('Error reverting note converted status:', e);
      }
    }

    // Fire-and-forget sync to server
    try {
      await fetch(`/api/concepts/${nodeId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error syncing node deletion with server:', err);
    }
  };

  // Handle Delete Concept Link
  const handleDeleteLink = async (linkId: string) => {
    const updatedLinks = links.filter((l) => l.id !== linkId);
    saveCanvasState(nodes, updatedLinks);
    try {
      await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  // Handle Node Click (Selection or Link Creation)
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
      setSelectedNodeId(selectedNodeId === nodeId ? null : nodeId);
    }
  };

  // Canvas Mouse & Drag Handlers
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    // If clicking on toolbar, modal, or input, do not start canvas pan
    if (
      (e.target as HTMLElement).closest(`.${styles.conceptNodeCircle}`) ||
      (e.target as HTMLElement).closest(`.${styles.canvasToolbar}`) ||
      (e.target as HTMLElement).closest(`.${styles.modalBackdrop}`)
    ) {
      return;
    }

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
  };

  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    if (activeTool === 'link') return;
    e.stopPropagation();
    setDraggingNodeId(nodeId);

    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      dragOffsetRef.current = {
        x: (e.clientX - panOffset.x) / zoomLevel - targetNode.positionX,
        y: (e.clientY - panOffset.y) / zoomLevel - targetNode.positionY,
      };
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.startPanX + dx,
        y: panStartRef.current.startPanY + dy,
      });
      return;
    }

    if (draggingNodeId) {
      const newX = (e.clientX - panOffset.x) / zoomLevel - dragOffsetRef.current.x;
      const newY = (e.clientY - panOffset.y) / zoomLevel - dragOffsetRef.current.y;

      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, positionX: Math.round(newX), positionY: Math.round(newY) } : n))
      );
    }
  };

  const handleMouseUpCanvas = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (draggingNodeId) {
      const movedNode = nodes.find((n) => n.id === draggingNodeId);
      if (movedNode) {
        fetch(`/api/concepts/${draggingNodeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ positionX: movedNode.positionX, positionY: movedNode.positionY }),
        }).catch((err) => console.error(err));
        saveCanvasState(nodes, links);
      }
      setDraggingNodeId(null);
    }
  };

  // Wheel Panning & Zooming
  const handleWheelCanvas = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomDelta = -e.deltaY * 0.0015;
      setZoomLevel((prev) => Math.min(Math.max(prev + zoomDelta, 0.4), 2.2));
    } else {
      // Pan
      setPanOffset((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Reset / Center Mind Map View
  const handleResetView = () => {
    if (nodes.length === 0) {
      setPanOffset({ x: 0, y: 0 });
      setZoomLevel(1);
      return;
    }

    const minX = Math.min(...nodes.map((n) => n.positionX));
    const maxX = Math.max(...nodes.map((n) => n.positionX + getNodeDiameter(n.text)));
    const minY = Math.min(...nodes.map((n) => n.positionY));
    const maxY = Math.max(...nodes.map((n) => n.positionY + getNodeDiameter(n.text)));

    const canvasWidth = canvasStageRef.current?.clientWidth || 800;
    const canvasHeight = canvasStageRef.current?.clientHeight || 600;

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setPanOffset({
      x: Math.round(canvasWidth / 2 - midX),
      y: Math.round(canvasHeight / 2 - midY),
    });
    setZoomLevel(1);
  };

  return (
    <main
      ref={canvasStageRef}
      className={`${styles.canvasArea} ${className || ''}`}
      style={{
        ...style,
        backgroundPosition: `${panOffset.x}px ${panOffset.y}px, center center`,
      }}
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMoveCanvas}
      onMouseUp={handleMouseUpCanvas}
      onMouseLeave={handleMouseUpCanvas}
      onWheel={handleWheelCanvas}
    >
      <div className={styles.canvasHeader}>
        <h1 className={styles.stageTitle}>{stageTitle}</h1>
        <span className={styles.panHint}>Drag background or use ✋ to pan • Scroll to move</span>
      </div>

      <div className={`${styles.canvasStage} ${isPanning ? styles.canvasStagePanning : ''}`}>
        <div
          className={styles.canvasContentLayer}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Connecting Links Layer */}
          <svg className={styles.svgOverlay}>
            <rect width="100%" height="100%" fill="none" pointerEvents="none" />
            {links.map((link) => {
              const fromNode = nodes.find((n) => n.id === link.fromNodeId);
              const toNode = nodes.find((n) => n.id === link.toNodeId);
              if (!fromNode || !toNode) return null;

              const isHovered = hoveredLinkId === link.id;
              const fromDiameter = getNodeDiameter(fromNode.text);
              const toDiameter = getNodeDiameter(toNode.text);
              const x1 = fromNode.positionX + fromDiameter / 2;
              const y1 = fromNode.positionY + fromDiameter / 2;
              const x2 = toNode.positionX + toDiameter / 2;
              const y2 = toNode.positionY + toDiameter / 2;

              return (
                <g
                  key={link.id}
                  onMouseEnter={() => setHoveredLinkId(link.id)}
                  onMouseLeave={() => setHoveredLinkId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLink(link.id);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                >
                  {/* Wide invisible hit line for easy mouse targeting */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(0,0,0,0)"
                    strokeWidth="16"
                    pointerEvents="stroke"
                  />
                  {/* Visible styled glow line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isHovered ? '#FF4FD8' : '#37F3FF'}
                    strokeWidth={isHovered ? 4 : 3}
                    className={styles.svgLineGlow}
                    pointerEvents="stroke"
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Concept Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isLinkSource = linkSourceNodeId === node.id;
            const isEditing = editingNodeId === node.id;
            const diameter = getNodeDiameter(node.text);

            return (
              <div
                key={node.id}
                className={`${styles.conceptNodeCircle} ${isSelected ? styles.selectedNode : ''} ${
                  activeTool === 'link' && isLinkSource ? styles.linkSourceNode : ''
                }`}
                style={{
                  left: `${node.positionX}px`,
                  top: `${node.positionY}px`,
                  width: `${diameter}px`,
                  height: `${diameter}px`,
                }}
                title={node.text}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateNodeText(node.id);
                        if (e.key === 'Escape') setEditingNodeId(null);
                      }}
                      className={styles.inlineEditInput}
                      autoFocus
                    />
                    <div className={styles.inlineEditBtns}>
                      <button
                        onClick={() => handleUpdateNodeText(node.id)}
                        className={styles.nodeSaveBtn}
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingNodeId(null)}
                        className={styles.nodeCancelBtn}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className={styles.nodeLabel} title={node.text}>
                      {node.text}
                    </span>

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
      </div>

      {/* Control Toolbar */}
      <div className={styles.canvasToolbar}>
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 2.2))}
          className={styles.toolbarBtn}
          title="Zoom In (Ctrl + Scroll Up)"
        >
          🔍+
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.4))}
          className={styles.toolbarBtn}
          title="Zoom Out (Ctrl + Scroll Down)"
        >
          🔍-
        </button>
        <button
          onClick={handleResetView}
          className={styles.toolbarBtn}
          title="Reset View / Center Mind Map"
        >
          🎯
        </button>
        <button
          onClick={() => {
            setActiveTool('pan');
            setLinkSourceNodeId(null);
          }}
          className={`${styles.toolbarBtn} ${activeTool === 'pan' ? styles.activeToolBtn : ''}`}
          title="Pan Tool (Click and drag canvas to move around)"
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
          onClick={() => {
            setActiveTool('link');
            setLinkSourceNodeId(null);
          }}
          className={`${styles.toolbarBtn} ${activeTool === 'link' ? styles.activeToolBtn : ''}`}
          title="Create Link (Click 2 nodes to connect)"
        >
          🖋️
        </button>
      </div>

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
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNode();
                if (e.key === 'Escape') setShowAddNodeModal(false);
              }}
              className={styles.modalInput}
              autoFocus
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
    </main>
  );
}
