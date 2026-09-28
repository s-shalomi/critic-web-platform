'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './synthesise.module.css';

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

export default function SynthesiseStagePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [synthesisText, setSynthesisText] = useState<string>('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showIntroModal, setShowIntroModal] = useState<boolean>(true);

  // Concept Map Reference State
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [links, setLinks] = useState<ConceptLink[]>([]);

  useEffect(() => {
    // 1. Fetch Existing Draft Synthesis
    fetch(`/api/modules/${moduleId}/synthesis`)
      .then((res) => res.json())
      .then((data) => {
        if (data.synthesisDraft) setSynthesisText(data.synthesisDraft);
      });

    // 2. Fetch Concept Map Nodes for right panel reference
    const savedNodes = localStorage.getItem(`critic_nodes_canvas_${moduleId}`);
    const savedLinks = localStorage.getItem(`critic_links_canvas_${moduleId}`);

    if (savedNodes) {
      try { setNodes(JSON.parse(savedNodes)); } catch (e) { console.error(e); }
    }
    if (savedLinks) {
      try { setLinks(JSON.parse(savedLinks)); } catch (e) { console.error(e); }
    }

    fetch(`/api/modules/${moduleId}/conceptualise`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && data.links && (!savedNodes || JSON.parse(savedNodes).length === 0)) {
          setNodes(data.nodes);
          setLinks(data.links);
        }
      });
  }, [moduleId]);

  const handleCrossCheckSynthesis = async () => {
    if (!synthesisText.trim()) return;
    setLoading(true);
    setAiFeedback(null);

    try {
      const res = await fetch(`/api/modules/${moduleId}/synthesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synthesisText }),
      });

      const data = await res.json();
      if (data.success && data.feedback) {
        setAiFeedback(data.feedback);
      }
    } catch (err) {
      setAiFeedback('Have you considered connecting the polar vortex destabilization evidence to your conclusions on regional cold spells?');
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

      {/* Main Workspace Split */}
      <div className={styles.workspace}>
        {/* Left Case Synthesis Editor Panel */}
        <aside className={styles.synthesisPanel}>
          <div className={styles.promptHeader}>
            <div className={styles.robotAvatarIcon} />
            <h2 className={styles.promptText}>
              Reflect on everything you learnt. What conclusions can you make?
            </h2>
          </div>

          <div className={styles.editorWrapper}>
            <textarea
              className={styles.synthesisTextArea}
              placeholder="Write your case synthesis here. Summarize your evidence, concept map connections, and answers to counter-arguments..."
              value={synthesisText}
              onChange={(e) => setSynthesisText(e.target.value)}
            />
          </div>

          <div className={styles.actionRow}>
            <button
              onClick={handleCrossCheckSynthesis}
              className="btn-primary-cyan"
              disabled={loading || !synthesisText.trim()}
            >
              {loading ? 'AI CROSS-CHECKING...' : 'AI CROSS-CHECK SYNTHESIS →'}
            </button>
            <button
              onClick={handleCompleteModule}
              className="btn-secondary-pink"
            >
              COMPLETE CASEFILE →
            </button>
          </div>

          {/* AI Cross-Check Socratic Feedback Panel */}
          {aiFeedback && (
            <div className={styles.feedbackCard}>
              <h4 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', marginBottom: '8px' }}>
                ARIA&apos;S CROSS-CHECK FEEDBACK
              </h4>
              <p>{aiFeedback}</p>
            </div>
          )}
        </aside>

        {/* Right Concept Map Reference Panel */}
        <main className={styles.rightCanvasPanel}>
          <div className={styles.canvasHeader}>
            <h1 className={styles.stageTitle}>synthesise</h1>
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
              const count = node.linkCount || 0;
              const size = 100 + count * 16;

              return (
                <div
                  key={node.id}
                  className={styles.conceptNodeCircle}
                  style={{
                    left: `${node.positionX}px`,
                    top: `${node.positionY}px`,
                    width: `${size}px`,
                    height: `${size}px`,
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

      {/* Bottom Stage Navigation Bar */}
      <footer className={styles.stageNavBar}>
        <button onClick={() => router.push(`/module/${moduleId}/familiarise`)} className={styles.stageStep}>
          01 familiarise
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/conceptualise`)} className={styles.stageStep}>
          02 conceptualise
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/inquire`)} className={styles.stageStep}>
          03 inquire
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/inquire`)} className={styles.stageStep}>
          04 evaluate
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/synthesise`)} className={`${styles.stageStep} ${styles.stageStepActive}`}>
          05 synthesise
        </button>
      </footer>

      {/* Stage Intro Modal */}
      {showIntroModal && (
        <div className={styles.modalBackdrop}>
          <div className="glass-card-glow" style={{ padding: '36px', maxWidth: '480px', width: '90%', textAlign: 'center' }}>
            <p className={styles.introModalText}>
              reflect on everything you learnt. what conclusions can you make?
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
