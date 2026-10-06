'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './conceptualise.module.css';

import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';
import ConceptMapCanvas from '@/shared/components/ConceptMapCanvas/ConceptMapCanvas';

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

  const [showIntroModal, setShowIntroModal] = useState<boolean>(true);
  const [agentSpeech, setAgentSpeech] = useState<string | null>(null);

  // Left Sources & Notes State
  const [sources, setSources] = useState<Source[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [pinnedNoteId, setPinnedNoteId] = useState<string | null>(null);

  useEffect(() => {
    const notesKey = getStudentStorageKey('critic_notes', moduleId);

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
      try {
        setNotes(JSON.parse(localSavedNotes));
      } catch (e) {
        console.error(e);
      }
    }
    fetch(`/api/modules/${moduleId}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes && data.notes.length > 0) setNotes(data.notes);
      });

    return () => {
      clearInterval(sourcesInterval);
      window.removeEventListener('focus', fetchSources);
    };
  }, [moduleId]);

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
                    <div
                      style={{
                        marginTop: '16px',
                        borderTop: '1px solid var(--color-border-slate-50)',
                        paddingTop: '10px',
                      }}
                    >
                      <h5
                        style={{
                          fontFamily: 'var(--font-orbitron)',
                          fontSize: '0.8rem',
                          marginBottom: '6px',
                        }}
                      >
                        Comments
                      </h5>
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

        {/* Right Concept Map Canvas using shared reusable component */}
        <ConceptMapCanvas moduleId={moduleId} stageTitle="conceptualise" />
      </div>

      {/* Socratic Agent Avatar */}
      <div className={styles.agentContainer}>
        {agentSpeech && (
          <div className={styles.speechBubble}>
            <div className={styles.speechHeader}>Aria (Socratic Peer)</div>
            <p>{agentSpeech}</p>
            <button onClick={() => setAgentSpeech(null)} className={styles.closeSpeechBtn}>
              ✕
            </button>
          </div>
        )}
        <button
          onClick={handleAgentClick}
          className={styles.agentAvatarBtn}
          title="Click Aria for Socratic Hints"
        >
          <div className={styles.robotHead}>
            <div className={styles.robotEyes} />
          </div>
        </button>
      </div>

      {/* Bottom Stage Navigation Bar */}
      <footer className={styles.stageNavBar}>
        <button
          onClick={() => router.push(`/module/${moduleId}/familiarise`)}
          className={styles.stageStep}
        >
          01 familiarise
        </button>
        <button
          onClick={() => router.push(`/module/${moduleId}/conceptualise`)}
          className={`${styles.stageStep} ${styles.stageStepActive}`}
        >
          02 conceptualise
        </button>
        <button
          onClick={() => router.push(`/module/${moduleId}/inquire`)}
          className={styles.stageStep}
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
            style={{ padding: '36px', maxWidth: '480px', width: '90%', textAlign: 'center' }}
          >
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
