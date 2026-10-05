'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './synthesise.module.css';

import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';

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
  const [notesCount, setNotesCount] = useState<number>(0);
  const [showNudge, setShowNudge] = useState<boolean>(true);

  useEffect(() => {
    const synthKey = getStudentStorageKey('critic_synthesis', moduleId);
    const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);
    const notesKey = getStudentStorageKey('critic_notes', moduleId);

    // Inform teacher portal this student is on the Synthesise stage
    reportStudentProgress('synthesise');

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

    // 1. Fetch Existing Draft Synthesis
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

    // 2. Fetch Concept Map Nodes for right panel reference
    const savedNodes = localStorage.getItem(nodesKey);
    const savedLinks = localStorage.getItem(linksKey);

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

  // Save student synthesis draft to student-scoped localStorage
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

      {/* Non-blocking AI Contextual Nudge Banner */}
      {notesCount === 0 && showNudge && (
        <div style={{ background: 'rgba(55, 243, 255, 0.12)', borderBottom: '1px solid var(--primary-cyan)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-light)', fontSize: '0.9rem' }}>
          <span>
            💡 <strong>AI Learning Nudge:</strong> You are drafting a synthesis without having collected evidence notes in the <strong>Familiarise</strong> stage! Gathering evidence first leads to a stronger case synthesis. You can proceed or return to Familiarise.
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
              onChange={(e) => handleSynthesisTextChange(e.target.value)}
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
          <div className="glass-card-glow" style={{ padding: '36px', maxWidth: '540px', width: '90%', textAlign: 'center' }}>
            <h3 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', marginBottom: '16px', fontSize: '1.2rem' }}>
              📝 SYNTHESISE CASEFILE DISCLOSURE
            </h3>
            <p className={styles.introModalText} style={{ marginBottom: '16px' }}>
              Reflect on everything you learnt. Write your synthesis, and trigger the AI cross-check to evaluate missing links or unaddressed arguments.
            </p>
            <div style={{ background: 'rgba(7, 11, 26, 0.7)', border: '1px solid var(--accent-magenta)', borderRadius: '10px', padding: '16px', textAlign: 'left', fontSize: '0.88rem', color: '#D9DFF7', lineHeight: '1.5' }}>
              <strong style={{ color: 'var(--accent-magenta)', display: 'block', marginBottom: '8px' }}>⚠️ Mandatory Socratic Peer Disclosure:</strong>
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}><strong>Socratic Cross-Checking:</strong> The AI agent (Aria) checks your synthesis against earlier evidence and concept nodes to question unaddressed arguments.</li>
                <li style={{ marginBottom: '6px' }}><strong>Reasoning Test:</strong> Aria presents questions rather than factual corrections.</li>
                <li><strong>No Verified Facts:</strong> Do not treat agent questions or statements as verified facts.</li>
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
