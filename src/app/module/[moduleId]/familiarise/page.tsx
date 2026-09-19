'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './familiarise.module.css';

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

  // Highlighting creation state
  const [selectedText, setSelectedText] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isHighlighting, setIsHighlighting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Hovered, Pinned, and Editing Note state
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [pinnedNoteId, setPinnedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  useEffect(() => {
    fetch('/api/topics/climate-change/sources')
      .then((res) => res.json())
      .then((data) => {
        if (data.sources && data.sources.length > 0) {
          setSources(data.sources);
          setSelectedSourceId(data.sources[0].id);
        }
      });

    fetch(`/api/modules/${moduleId}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes) setNotes(data.notes);
      });
  }, [moduleId]);

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
        setNotes((prev) => [...prev, data.note]);
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
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, noteText: editText } : n))
        );
        setEditingNoteId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        if (hoveredNoteId === noteId) setHoveredNoteId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToNode = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/convert-to-node`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, convertedToNode: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAgentClick = async () => {
    try {
      const res = await fetch(`/api/modules/${moduleId}/agent/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'familiarise' }),
      });
      const data = await res.json();
      if (data.hint) {
        setAgentSpeech(data.hint);
      }
    } catch (err) {
      setAgentSpeech('What underlying assumptions might the author be making in this claim?');
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
                        onClick={() => {
                          setEditingNoteId(n.id);
                          setEditText(n.noteText);
                        }}
                        className={styles.actionIconBtn}
                        title="Edit note"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
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
                        onClick={() => handleConvertToNode(n.id)}
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
          {currentSource && (
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
          )}

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
        <button onClick={() => router.push(`/module/${moduleId}/familiarise`)} className={`${styles.stageStep} ${styles.stageStepActive}`}>
          01 familiarise
        </button>
        <button onClick={() => router.push(`/module/${moduleId}/conceptualise`)} className={styles.stageStep}>
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

      {/* Stage Intro Modal */}
      {showIntroModal && (
        <div className={styles.modalBackdrop}>
          <div className="glass-card-glow" style={{ padding: '36px', maxWidth: '480px', width: '90%', textAlign: 'center' }}>
            <p className={styles.introModalText}>
              read through the content. highlight the text and mark any thoughts, biases or assumptions. hover over highlighted text to edit, delete, or convert your notes. click on the AI agent if you need any hints
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
