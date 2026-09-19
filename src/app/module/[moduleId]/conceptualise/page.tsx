'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './conceptualise.module.css';

interface ConceptNode {
  id: string;
  text: string;
  positionX: number;
  positionY: number;
  linkCount?: number;
}

interface ConceptLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

export default function ConceptualiseStagePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [links, setLinks] = useState<ConceptLink[]>([]);
  const [showIntroModal, setShowIntroModal] = useState<boolean>(true);
  const [agentSpeech, setAgentSpeech] = useState<string | null>(null);

  // Tools & Canvas State
  const [activeTool, setActiveTool] = useState<'pan' | 'add_node' | 'link'>('pan');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [linkSourceNodeId, setLinkSourceNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showAddNodeModal, setShowAddNodeModal] = useState<boolean>(false);
  const [newNodeText, setNewNodeText] = useState<string>('');

  // Physics Drag State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check localStorage fallback first for instant offline reload persistence
    const savedNodes = localStorage.getItem(`critic_nodes_canvas_${moduleId}`);
    const savedLinks = localStorage.getItem(`critic_links_canvas_${moduleId}`);

    if (savedNodes && savedLinks) {
      try {
        setNodes(JSON.parse(savedNodes));
        setLinks(JSON.parse(savedLinks));
      } catch (e) {
        console.error(e);
      }
    }

    // Fetch server data
    fetch(`/api/modules/${moduleId}/conceptualise`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && data.links) {
          setNodes(data.nodes);
          setLinks(data.links);
          localStorage.setItem(`critic_nodes_canvas_${moduleId}`, JSON.stringify(data.nodes));
          localStorage.setItem(`critic_links_canvas_${moduleId}`, JSON.stringify(data.links));
        }
      });
  }, [moduleId]);

  // Sync state helpers
  const saveState = (updatedNodes: ConceptNode[], updatedLinks: ConceptLink[]) => {
    setNodes(updatedNodes);
    setLinks(updatedLinks);
    localStorage.setItem(`critic_nodes_canvas_${moduleId}`, JSON.stringify(updatedNodes));
    localStorage.setItem(`critic_links_canvas_${moduleId}`, JSON.stringify(updatedLinks));
  };

  /**
   * Synthesizes audio feedback using Web Audio API when a link is formed
   */
  const playLinkAudioSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 tone
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 tone

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio context fallback
    }
  };

  const handleAddNode = async () => {
    if (!newNodeText.trim()) return;
    const posX = 300 + Math.random() * 100;
    const posY = 200 + Math.random() * 100;

    try {
      const res = await fetch(`/api/modules/${moduleId}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNodeText, positionX: posX, positionY: posY }),
      });
      const data = await res.json();

      if (data.success && data.node) {
        const updated = [...nodes, { ...data.node, linkCount: 0 }];
        saveState(updated, links);
        setNewNodeText('');
        setShowAddNodeModal(false);
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
        // Create link
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
            // Update node linkCounts
            const updatedNodes = nodes.map((n) => {
              if (n.id === linkSourceNodeId || n.id === nodeId) {
                return { ...n, linkCount: (n.linkCount || 0) + 1 };
              }
              return n;
            });
            saveState(updatedNodes, updatedLinks);
          }
        } finally {
          setLinkSourceNodeId(null);
        }
      }
    } else {
      setSelectedNodeId(nodeId);
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
        saveState(nodes, links);
      }
      setDraggingNodeId(null);
    }
  };

  const handleAgentClick = async () => {
    try {
      const res = await fetch(`/api/modules/${moduleId}/agent/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'conceptualise' }),
      });
      const data = await res.json();
      if (data.hint) {
        setAgentSpeech(data.hint);
      }
    } catch (err) {
      setAgentSpeech('How does this concept connect to the evidence you highlighted earlier?');
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

      {/* Main Workspace Split */}
      <div className={styles.workspace}>
        {/* Left Source Reference Card Panel */}
        <aside className={styles.leftSourcePanel}>
          <div className="glass-card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className={styles.authorHeader}>
              <div className={styles.authorAvatar} />
              <span className={styles.authorName}>Donald Trump</span>
            </div>
            <p className={styles.sourceText}>
              Be careful and try staying in your house. Large parts of the Country are suffering from tremendous amounts of snow and near record setting cold. Amazing how big this system is. Wouldn&apos;t be bad to have a little of that good old fashioned Global Warming right now!
            </p>
          </div>
        </aside>

        {/* Right Concept Map Canvas */}
        <main
          ref={canvasRef}
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
              const count = node.linkCount || 0;
              // Node growth radius calculation
              const size = 100 + count * 16;
              const isSelected = selectedNodeId === node.id;
              const isLinkSource = linkSourceNodeId === node.id;

              return (
                <div
                  key={node.id}
                  className={`${styles.conceptNodeCircle} ${isSelected ? styles.selectedNode : ''} ${isLinkSource ? styles.linkSourceNode : ''}`}
                  style={{
                    left: `${node.positionX}px`,
                    top: `${node.positionY}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    boxShadow: `0 0 ${20 + count * 10}px rgba(255, 79, 216, ${0.4 + count * 0.15})`,
                  }}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  onClick={() => handleNodeClick(node.id)}
                >
                  <span className={styles.nodeLabel}>{node.text}</span>
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
        <button onClick={() => router.push(`/module/${moduleId}/evaluate`)} className={styles.stageStep}>
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
