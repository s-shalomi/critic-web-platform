'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './familiarise.module.css';

import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';

interface Source {
  id: string;
  topicId: string;
  orderIndex: number;
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

export default function FamiliariseStagePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [showIntroModal, setShowIntroModal] = useState<boolean>(true);
  const [agentSpeech, setAgentSpeech] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState<boolean>(false);

  // Highlighting creation state
  const [selectedText, setSelectedText] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isHighlighting, setIsHighlighting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Hovered, Pinned, Editing Note & Toast state
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [pinnedNoteId, setPinnedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const notesKey = getStudentStorageKey('critic_notes', moduleId);

    // Inform teacher portal this student is on the Familiarise stage
    reportStudentProgress('familiarise');

    const fetchSources = () => {
      fetch('/api/topics/climate-change/sources')
        .then((res) => res.json())
        .then((data) => {
          if (data.sources) {
            setSources(data.sources);
            setSelectedSourceId((prev) => {
              if (data.sources.some((s: Source) => s.id === prev)) return prev;
              return data.sources.length > 0 ? data.sources[0].id : '';
            });
          }
        })
        .catch((err) => console.error('Error fetching sources:', err))
        .finally(() => setLoading(false));
    };

    fetchSources();
    const sourcesInterval = setInterval(fetchSources, 4000);
    // Cross-validate convertedToNode against actual existing canvas nodes
    const syncNotesWithCanvas = (loadedNotes: Note[]) => {
      const canvasKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
      const canvasStr = localStorage.getItem(canvasKey);
      let canvasNodes: Array<{ id: string; text: string; sourceNoteId?: string }> = [];
      if (canvasStr) {
        try { canvasNodes = JSON.parse(canvasStr); } catch (e) { /* ignore */ }
      }

      return loadedNotes.map((note) => {
        if (!note.convertedToNode) return note;
        // Verify if a node actually exists for this note
        const hasNode = canvasNodes.some(
          (cn) => (cn.sourceNoteId && cn.sourceNoteId === note.id) ||
                  cn.text === note.noteText ||
                  cn.text === note.highlightedText
        );
        return hasNode ? note : { ...note, convertedToNode: false };
      });
    };

    // Check localStorage fallback first for instant offline reload persistence
    const localSaved = localStorage.getItem(notesKey);
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        const verified = syncNotesWithCanvas(parsed);
        setNotes(verified);
        localStorage.setItem(notesKey, JSON.stringify(verified));
      } catch (e) {
        console.error(e);
      }
    }

    // Sync with server notes API
    fetch(`/api/modules/${moduleId}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes && data.notes.length > 0) {
          const verified = syncNotesWithCanvas(data.notes);
          setNotes(verified);
          localStorage.setItem(notesKey, JSON.stringify(verified));
        }
      });

    const handleFocusSync = () => {
      fetchSources();
      const currentNotes = localStorage.getItem(notesKey);
      if (currentNotes) {
        try {
          const parsed = JSON.parse(currentNotes);
          const verified = syncNotesWithCanvas(parsed);
          setNotes(verified);
          localStorage.setItem(notesKey, JSON.stringify(verified));
        } catch (e) { /* ignore */ }
      }
    };

    window.addEventListener('focus', handleFocusSync);

    return () => {
      clearInterval(sourcesInterval);
      window.removeEventListener('focus', fetchSources);
      window.removeEventListener('focus', handleFocusSync);
    };
  }, [moduleId]);

  // Sync notes state to localStorage whenever notes change
  const updateNotesState = (newNotes: Note[] | ((prev: Note[]) => Note[])) => {
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    setNotes((prev) => {
      const updated = typeof newNotes === 'function' ? newNotes(prev) : newNotes;
      localStorage.setItem(notesKey, JSON.stringify(updated));
      return updated;
    });
  };

  const currentSource = sources.find((s) => s.id === selectedSourceId) || sources[0];
  const sourceNotes = notes.filter((n) => n.sourceId === selectedSourceId);

  const handleMouseUp = () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 3) {
      setSelectedText(selection);
      setIsHighlighting(true);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedText || !noteInput.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/modules/${moduleId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: selectedSourceId,
          highlightedText: selectedText,
          noteText: noteInput,
        }),
      });

      const data = await res.json();
      if (data.success) {
        updateNotesState((prev) => [...prev, data.note]);
        setSelectedText('');
        setNoteInput('');
        setIsHighlighting(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText: editText }),
      });
      const data = await res.json();

      if (data.success) {
        updateNotesState((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, noteText: editText } : n))
        );
        setEditingNoteId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    updateNotesState((prev) => prev.filter((n) => n.id !== noteId));
    setHoveredNoteId(null);
    setPinnedNoteId(null);
    setEditingNoteId(null);

    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToNode = async (noteId: string) => {
    // 1. Instantly update local notes state to show '✓ Converted to Concept Node'
    const targetNote = notes.find((n) => n.id === noteId);
    updateNotesState((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, convertedToNode: true } : n))
    );

    // 2. Generate concept node object
    const conceptNodeToSave = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      moduleId,
      text: targetNote ? (targetNote.noteText || targetNote.highlightedText) : 'Key Concept',
      positionX: 180 + Math.random() * 220,
      positionY: 140 + Math.random() * 180,
      sourceNoteId: noteId,
      linkCount: 0,
    };

    // 3. Save into canvas localStorage store immediately
    const canvasNodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const savedCanvasNodesStr = localStorage.getItem(canvasNodesKey);
    const canvasNodes = savedCanvasNodesStr ? JSON.parse(savedCanvasNodesStr) : [];
    canvasNodes.push(conceptNodeToSave);
    localStorage.setItem(canvasNodesKey, JSON.stringify(canvasNodes));

    // 4. Show visual feedback toast banner
    setToastMsg('✨ Note converted to Concept Node! Added to Visual Map.');
    setTimeout(() => setToastMsg(null), 3500);

    // 5. Sync with server API
    try {
      await fetch(`/api/notes/${noteId}/convert-to-node`, {
        method: 'POST',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAgentClick = async () => {
    if (agentLoading) return;
    setAgentLoading(true);
    setAgentSpeech(null);

    try {
      const hintKey = getStudentStorageKey('critic_hints', moduleId);
      const current = parseInt(localStorage.getItem(hintKey) || '0', 10);
      localStorage.setItem(hintKey, String(current + 1));

      const res = await fetch(`/api/modules/${moduleId}/agent/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'familiarise',
          sourceTitle: currentSource?.title,
          sourceText: currentSource?.content?.text,
        }),
      });
      const data = await res.json();
      if (data.hint) {
        setAgentSpeech(data.hint);
      } else if (data.error) {
        setAgentSpeech('⚠️ AI service is experiencing high demand. Please try clicking again in a few moments.');
      }
    } catch (err) {
      setAgentSpeech('What underlying assumptions might the author be making in this claim?');
    } finally {
      setAgentLoading(false);
    }
  };

  /**
   * Helper to render source text with interactive inline highlights & hover tooltips
   */
  const renderHighlightedText = (fullText: string) => {
    if (!sourceNotes || sourceNotes.length === 0) {
      return fullText;
    }

    // Build regex pattern matching all highlighted snippets for current source
    let parts: Array<{ text: string; note?: Note }> = [{ text: fullText }];

    sourceNotes.forEach((note) => {
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
      const isEditing = editingNoteId === n.id;
      const isVisible = isHovered || isPinned || isEditing;

      return (
        <span
          key={index}
          className={`${styles.highlightedSpan} ${isPinned ? styles.pinnedSpan : ''}`}
          onMouseEnter={() => setHoveredNoteId(n.id)}
          onMouseLeave={() => {
            if (!isEditing) setHoveredNoteId(null);
          }}
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

          {/* Hover / Pinned Tooltip Popup */}
          {isVisible && (
            <span
              className={styles.hoverTooltip}
              onClick={(e) => e.stopPropagation()}
            >
              {isEditing ? (
                <div className={styles.editForm}>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className={styles.editTextArea}
                  />
                  <div className={styles.tooltipActions}>
                    <button
                      onClick={() => setEditingNoteId(null)}
                      className={styles.cancelTooltipBtn}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateNote(n.id)}
                      className={styles.saveTooltipBtn}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.tooltipContent}>
                  <div className={styles.tooltipHeader}>
                    <span className={styles.tooltipLabel}>
                      NOTE {isPinned ? '📌 (PINNED)' : ''}
                    </span>
                    <div className={styles.tooltipHeaderBtns}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNoteId(n.id);
                          setEditText(n.noteText);
                        }}
                        className={styles.actionIconBtn}
                        title="Edit note"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(n.id);
                        }}
                        className={styles.deleteIconBtn}
                        title="Delete note"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  <p className={styles.tooltipNoteText}>{n.noteText}</p>

                  <div className={styles.tooltipFooter}>
                    {n.convertedToNode ? (
                      <span className={styles.convertedBadge}>✓ Converted to Concept Node</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvertToNode(n.id);
                        }}
                        className={styles.convertTooltipBtn}
                      >
                        + Convert to node
                      </button>
                    )}
                  </div>
                </div>
              )}
            </span>
          )}
        </span>
      );
    });
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.header}>
        <button onClick={() => router.push('/dashboard')} className={styles.backBtn}>
          ← Climate Change
        </button>
      </header>

      {/* Main Workspace split */}
      <div className={styles.workspace}>
        {/* Left Sidebar */}
        <aside className={styles.sidebar}>
          <h2 className={styles.stageHeading}>Familiarise + explore</h2>
          <nav className={styles.sourceNav}>
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSourceId(s.id)}
                className={`${styles.sourceNavItem} ${
                  s.id === selectedSourceId ? styles.activeSourceNavItem : ''
                }`}
              >
                {s.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Center Content Area */}
        <main className={styles.contentArea}>
          {loading && (!currentSource || sources.length === 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '360px', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid rgba(55, 243, 255, 0.2)', borderTopColor: '#37F3FF', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', fontSize: '1.1rem', letterSpacing: '1px' }}>
                LOADING EVIDENCE SOURCES...
              </div>
            </div>
          ) : currentSource ? (
            <div className={styles.sourceCardContainer}>
              <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '800px', position: 'relative' }}>
                {currentSource.content.authorName && (
                  <div className={styles.authorHeader}>
                    <div className={styles.authorAvatar} />
                    <span className={styles.authorName}>{currentSource.content.authorName}</span>
                  </div>
                )}

                <div
                  className={styles.sourceBodyText}
                  onMouseUp={handleMouseUp}
                >
                  {renderHighlightedText(currentSource.content.text)}

                  {currentSource.content.comments && (
                    <div className={styles.commentsList}>
                      <h4 style={{ fontFamily: 'var(--font-orbitron)', marginTop: '28px', marginBottom: '16px' }}>
                        Comments
                      </h4>
                      {currentSource.content.comments.map((c, i) => (
                        <div key={i} className={styles.commentItem}>
                          <strong className="cyan-neon-text">{c.author}:</strong>{' '}
                          {renderHighlightedText(c.text)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Note Creation Modal / Popover */}
          {isHighlighting && (
            <div className={styles.highlightPopover}>
              <h4 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)' }}>
                CREATE NOTE ON HIGHLIGHT
              </h4>
              <blockquote className={styles.highlightQuote}>
                &quot;{selectedText}&quot;
              </blockquote>
              <textarea
                className={styles.noteTextArea}
                placeholder="What assumptions, biases, or thoughts does this trigger?"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  onClick={() => setIsHighlighting(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="btn-primary-cyan"
                  disabled={loading}
                >
                  {loading ? 'SAVING...' : 'SAVE NOTE'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Socratic Agent Avatar */}
      <div className={styles.agentContainer}>
        {agentLoading && (
          <div className={styles.loadingSpeechBubble}>
            <div className={styles.spinnerSmall} />
            <span className={styles.loadingBubbleText}>Aria is analyzing evidence &amp; formulating hint...</span>
          </div>
        )}
        {!agentLoading && agentSpeech && (
          <div className={styles.speechBubble}>
            <div className={styles.speechHeader}>Aria (Socratic Peer)</div>
            <p>{agentSpeech}</p>
            <button onClick={() => setAgentSpeech(null)} className={styles.closeSpeechBtn}>✕</button>
          </div>
        )}
        <button
          onClick={handleAgentClick}
          disabled={agentLoading}
          className={`${styles.agentAvatarBtn} ${agentLoading ? styles.agentAvatarBtnLoading : ''}`}
          title={agentLoading ? 'Aria is analyzing evidence...' : 'Click Aria for Socratic Hints'}
        >
          <div className={styles.robotHead}>
            <div className={styles.robotEyes} />
          </div>
        </button>
      </div>

      {/* Bottom Stage Navigation Bar */}
      <footer className={styles.stageNavBar}>
        <button onClick={() => router.push(`/module/${moduleId}/familiarise`)} className={`${styles.stageStep} ${styles.stageStepActive}`}>
          01 familiarise
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/conceptualise`)} className={styles.stageStep}>
          02 conceptualise
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/inquire`)} className={styles.stageStep}>
          03 inquire + evaluate
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/synthesise`)} className={styles.stageStep}>
          04 synthesise
        </button>
      </footer>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className={styles.toastBanner}>
          {toastMsg}
        </div>
      )}

      {/* Stage Intro & AI Disclosure Modal */}
      {showIntroModal && (
        <div className={styles.modalBackdrop}>
          <div className="glass-card-glow" style={{ padding: '36px', maxWidth: '540px', width: '90%', textAlign: 'center' }}>
            <h3 className="cyan-neon-text" style={{ fontFamily: 'var(--font-orbitron)', marginBottom: '16px', fontSize: '1.2rem' }}>
              🔍 INVESTIGATION BRIEFING & AI DISCLOSURE
            </h3>
            <p className={styles.introModalText} style={{ marginBottom: '16px' }}>
              Read through the climate sources. Highlight text and capture your thoughts, biases, or assumptions. Hover over highlighted snippets to edit, delete, or convert them into concept map nodes.
            </p>
            <div style={{ background: 'rgba(7, 11, 26, 0.7)', border: '1px solid var(--accent-magenta)', borderRadius: '10px', padding: '16px', textAlign: 'left', fontSize: '0.88rem', color: '#D9DFF7', lineHeight: '1.5' }}>
              <strong style={{ color: 'var(--accent-magenta)', display: 'block', marginBottom: '8px' }}>⚠️ Mandatory Socratic Peer Disclosure:</strong>
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}><strong>Socratic Questioning & Devil&apos;s Advocate:</strong> The AI agent (Aria) will guide you through questioning and may challenge your claims with counter-arguments.</li>
                <li style={{ marginBottom: '6px' }}><strong>Reasoning Test:</strong> Aria may present arguments or claims it does not &quot;believe&quot; solely to test your analytical reasoning.</li>
                <li><strong>No Verified Facts:</strong> Do not treat statements from the AI agent as absolute verified facts—evaluate all evidence critically yourself.</li>
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
