'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './familiarise.module.css';

import {
  getStudentStorageKey,
  hasSeenModuleDisclosure,
  markModuleDisclosureSeen,
  hasSeenStageTutorial,
  markStageTutorialSeen,
} from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';
import {
  RobotAvatar,
  getStoredAgentPreferences,
  getStageOpener,
  DEFAULT_AGENT_PREFERENCES,
  ResolvedAgentPreferences,
} from '@/shared/components/RobotAvatar/RobotAvatar';
import { TooltipTutorial } from '@/shared/components/TooltipTutorial/TooltipTutorial';
import { StageOverviewModal } from '@/shared/components/StageOverviewModal/StageOverviewModal';
import { STAGE_TUTORIAL_STEPS } from '@/shared/config/tutorials';

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

function getAuthorInitials(name?: string): string {
  if (!name) return 'SR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function FamiliariseStagePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [sources, setSources] = useState<Source[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('critic_sources_climate-change');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [selectedSourceId, setSelectedSourceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('critic_sources_climate-change');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
        }
      } catch {}
    }
    return '';
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [showIntroModal, setShowIntroModal] = useState<boolean>(false);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showOverviewModal, setShowOverviewModal] = useState<boolean>(false);
  const [agentSpeech, setAgentSpeech] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState<boolean>(false);
  const [agentPrefs, setAgentPrefs] = useState<ResolvedAgentPreferences>(DEFAULT_AGENT_PREFERENCES);

  // Highlighting creation state
  const [selectedText, setSelectedText] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isHighlighting, setIsHighlighting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => sources.length === 0);

  // Hovered, Pinned, Editing Note & Toast state
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [pinnedNoteId, setPinnedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleCloseIntroModal = () => {
    setShowIntroModal(false);
    if (!hasSeenStageTutorial(moduleId, 'familiarise')) {
      setShowTutorialModal(true);
    }
  };

  const handleCloseTutorial = () => {
    setShowTutorialModal(false);
    markStageTutorialSeen(moduleId, 'familiarise');
  };

  useEffect(() => {
    if (sources.length === 0) setLoading(true);
    setAgentPrefs(getStoredAgentPreferences());
    const notesKey = getStudentStorageKey('critic_notes', moduleId);

    // Show mandatory AI disclosure automatically once when the student first enters the module
    if (!hasSeenModuleDisclosure(moduleId)) {
      setShowIntroModal(true);
      markModuleDisclosureSeen(moduleId);
    } else if (!hasSeenStageTutorial(moduleId, 'familiarise')) {
      setShowTutorialModal(true);
    }

    // Inform teacher portal this student is on the Familiarise stage
    reportStudentProgress('familiarise');

    const fetchSources = () => {
      fetch('/api/topics/climate-change/sources')
        .then((res) => res.json())
        .then((data) => {
          if (data.sources) {
            setSources(data.sources);
            try {
              localStorage.setItem('critic_sources_climate-change', JSON.stringify(data.sources));
            } catch {}
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
        try {
          canvasNodes = JSON.parse(canvasStr);
        } catch (e) {
          /* ignore */
        }
      }

      return loadedNotes.map((note) => {
        if (!note.convertedToNode) return note;
        const hasNode = canvasNodes.some(
          (cn) =>
            (cn.sourceNoteId && cn.sourceNoteId === note.id) ||
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
      setAgentPrefs(getStoredAgentPreferences());
      const currentNotes = localStorage.getItem(notesKey);
      if (currentNotes) {
        try {
          const parsed = JSON.parse(currentNotes);
          const verified = syncNotesWithCanvas(parsed);
          setNotes(verified);
          localStorage.setItem(notesKey, JSON.stringify(verified));
        } catch (e) {
          /* ignore */
        }
      }
    };

    window.addEventListener('focus', handleFocusSync);

    return () => {
      clearInterval(sourcesInterval);
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
    const targetNote = notes.find((n) => n.id === noteId);

    updateNotesState((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, noteText: editText } : n))
    );
    setEditingNoteId(null);

    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteText: editText,
          moduleId,
          sourceId: targetNote?.sourceId || selectedSourceId,
          highlightedText: targetNote?.highlightedText,
        }),
      });
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
    const targetNote = notes.find((n) => n.id === noteId);
    updateNotesState((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, convertedToNode: true } : n))
    );

    const conceptNodeToSave = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      moduleId,
      text: targetNote ? targetNote.noteText || targetNote.highlightedText : 'Key Concept',
      positionX: 180 + Math.random() * 220,
      positionY: 140 + Math.random() * 180,
      sourceNoteId: noteId,
      linkCount: 0,
    };

    const canvasNodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const savedCanvasNodesStr = localStorage.getItem(canvasNodesKey);
    const canvasNodes = savedCanvasNodesStr ? JSON.parse(savedCanvasNodesStr) : [];
    canvasNodes.push(conceptNodeToSave);
    localStorage.setItem(canvasNodesKey, JSON.stringify(canvasNodes));

    setToastMsg('✨ Note converted to Concept Node! Added to Mind Map.');
    setTimeout(() => setToastMsg(null), 3500);

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
      const nextHintCount = current + 1;
      localStorage.setItem(hintKey, String(nextHintCount));

      const res = await fetch(`/api/modules/${moduleId}/agent/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'familiarise',
          sourceId: selectedSourceId,
          sourceTitle: currentSource?.title,
          sourceText: currentSource?.content?.text,
          notes: sourceNotes.map((n) => ({
            highlightedText: n.highlightedText,
            noteText: n.noteText,
          })),
          agentPersonality: `${agentPrefs.toneName} (${agentPrefs.toneDesc})`,
          avatarName: agentPrefs.avatarName,
          hintCount: nextHintCount,
        }),
      });
      const data = await res.json();
      if (data.hint) {
        setAgentSpeech(data.hint);
      } else if (data.error) {
        setAgentSpeech(
          '⚠️ AI service is experiencing high demand. Please try clicking again in a few moments.'
        );
      }
    } catch (err) {
      setAgentSpeech(getStageOpener('familiarise', agentPrefs.toneName));
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

          {isVisible && (
            <span className={styles.hoverTooltip} onClick={(e) => e.stopPropagation()}>
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
      {/* Main Split Workspace matching screens_v2/familiarise.png */}
      <div className={styles.workspace}>
        {/* Left Sidebar */}
        <aside className={styles.sidebar} data-tour="sidebar-sources">
          <button onClick={() => router.push('/dashboard')} className={styles.backBtn}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Climate Change</span>
          </button>

          <h1 className={styles.stageHeading}>Read + Annotate</h1>

          <nav className={styles.sourceNav} aria-label="Evidence sources">
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

          {/* Bottom-Left Selected Agent Avatar & Tone Display */}
          <div className={styles.agentSidebarDock} data-tour="agent-dock">
            {agentLoading && (
              <div className={styles.loadingSpeechBubble}>
                <div className={styles.spinnerSmall} />
                <span className={styles.loadingBubbleText}>
                  {agentPrefs.avatarName} ({agentPrefs.toneName}) is analyzing evidence...
                </span>
              </div>
            )}

            {!agentLoading && agentSpeech && (
              <div className={styles.speechBubble}>
                <div className={styles.speechHeader}>
                  <span>{agentPrefs.avatarName}</span>
                  <span className={styles.speechToneBadge}>{agentPrefs.toneName}</span>
                </div>
                <p>{agentSpeech}</p>
                {agentSpeech.includes('⚠️') && (
                  <button
                    type="button"
                    onClick={handleAgentClick}
                    style={{
                      marginTop: '6px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: '1px solid #37F3FF',
                      background: 'rgba(55, 243, 255, 0.14)',
                      color: '#37F3FF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ↻ Retry
                  </button>
                )}
                <button
                  onClick={() => setAgentSpeech(null)}
                  className={styles.closeSpeechBtn}
                  aria-label="Close agent hint"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleAgentClick}
              disabled={agentLoading}
              className={`${styles.agentAvatarBtn} ${
                agentLoading ? styles.agentAvatarBtnLoading : ''
              }`}
              title={`Click ${agentPrefs.avatarName} (${agentPrefs.toneName} tone) for a Socratic hint`}
            >
              <RobotAvatar variant={agentPrefs.appearance} size={130} />
            </button>

            <div className={styles.agentMetaPill} onClick={handleAgentClick}>
              <span className={styles.agentMetaName}>{agentPrefs.avatarName}</span>
              <span className={styles.agentMetaDivider}>•</span>
              <span className={styles.agentMetaTone}>Tone: {agentPrefs.toneName}</span>
            </div>
          </div>
        </aside>

        {/* Right Main Content Stage */}
        <main className={styles.contentArea}>
          {/* Top-Right AI Disclosure, Tutorial & Help Buttons */}
          <div className={styles.topRightActions}>
            <button
              type="button"
              onClick={() => setShowIntroModal(true)}
              className={styles.disclosureBtn}
              aria-label="AI Disclosure"
              title="View AI Agent Disclosure"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>AI Disclosure</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTutorialModal(true)}
              className={styles.tutorialBtn}
              data-tour="tutorial-btn"
              title="View Stage Tutorial"
            >
              <span className={styles.iconSquare}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="8 5 19 12 8 19 8 5" />
                </svg>
              </span>
              <span>Tutorial</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOverviewModal(true)}
              className={styles.helpCircleBtn}
              data-tour="help-btn"
              aria-label="Help"
              title="Stage Overview: Why Annotate Matters"
            >
              <span className={styles.iconSquare}>?</span>
            </button>
          </div>

          {/* Scrollable Center Source Reading Viewport */}
          <div className={styles.centerStageWrapper}>
            {loading && (!currentSource || sources.length === 0) ? (
              <div className={styles.loadingStateBox}>
                <div className={styles.loadingSpinner} />
                <div className={styles.loadingStateText}>Loading evidence sources...</div>
              </div>
            ) : currentSource ? (
              <div className={styles.sourceCardContainer}>
                <article className={styles.sourceCard} data-tour="source-reading">
                  <div className={styles.authorHeader}>
                    <div className={styles.authorAvatar}>
                      {getAuthorInitials(currentSource.content.authorName || currentSource.title)}
                    </div>
                    <h2 className={styles.authorName}>
                      {currentSource.content.authorName || currentSource.title}
                    </h2>
                  </div>

                  <div className={styles.sourceBodyText} onMouseUp={handleMouseUp}>
                    {renderHighlightedText(currentSource.content.text)}

                    {currentSource.content.comments &&
                      currentSource.content.comments.length > 0 && (
                        <div className={styles.commentsList}>
                          <h4 className={styles.commentsHeading}>Comments</h4>
                          {currentSource.content.comments.map((c, i) => (
                            <div key={i} className={styles.commentItem}>
                              <strong className={styles.commentAuthor}>{c.author}:</strong>{' '}
                              {renderHighlightedText(c.text)}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </article>
              </div>
            ) : null}
          </div>

          {/* Note Creation Popover */}
          {isHighlighting && (
            <div className={styles.highlightPopover}>
              <h4 className={styles.popoverTitle}>Annotate Highlighted Text</h4>
              <blockquote className={styles.highlightQuote}>&quot;{selectedText}&quot;</blockquote>
              <textarea
                className={styles.noteTextArea}
                placeholder="What assumptions, biases, or questions does this trigger?"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
              />
              <div className={styles.popoverActions}>
                <button onClick={() => setIsHighlighting(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className={styles.saveNoteBtn}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          )}

          {/* Floating Stage Navigation Dock */}
          <div className={styles.stageNavWrapper} data-tour="stage-dock">
            <nav className={styles.stageNavBar} aria-label="Module stages">
              <button
                type="button"
                onClick={() => router.push(`/module/${moduleId}/familiarise`)}
                className={`${styles.stageStep} ${styles.stageStepActive}`}
                aria-current="step"
              >
                <span className={`${styles.stageCircle} ${styles.stageCircleActive}`}>01</span>
                <span className={styles.stageLabel}>Annotate</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/module/${moduleId}/conceptualise`)}
                className={styles.stageStep}
              >
                <span className={styles.stageCircle}>02</span>
                <span className={styles.stageLabel}>Mind Map</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/module/${moduleId}/inquire`)}
                className={styles.stageStep}
              >
                <span className={styles.stageCircle}>03</span>
                <span className={styles.stageLabel}>Challenge</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/module/${moduleId}/synthesise`)}
                className={styles.stageStep}
              >
                <span className={styles.stageCircle}>04</span>
                <span className={styles.stageLabel}>Conclude</span>
              </button>
            </nav>
          </div>
        </main>
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && <div className={styles.toastBanner}>{toastMsg}</div>}

      {/* Interactive Tooltip Onboarding Tutorial */}
      <TooltipTutorial
        stageName="Annotate"
        steps={STAGE_TUTORIAL_STEPS.familiarise}
        isOpen={showTutorialModal}
        onClose={handleCloseTutorial}
        onComplete={handleCloseTutorial}
      />

      {/* Stage Overview Modal (? Button) */}
      <StageOverviewModal
        stage="familiarise"
        isOpen={showOverviewModal}
        onClose={() => setShowOverviewModal(false)}
      />

      {/* Mandatory AI Disclosure Modal */}
      {showIntroModal && (
        <div className={styles.modalBackdrop} onClick={handleCloseIntroModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseIntroModal}
              className={styles.modalCloseBtn}
              aria-label="Close disclosure"
            >
              ✕
            </button>
            <h3 className={styles.modalTitle}>AI Agent Disclosure</h3>
            <p className={styles.introModalText}>
              Before interacting with <strong>{agentPrefs.avatarName}</strong> ({agentPrefs.toneName}{' '}
              tone) in this module, please note how the AI peer operates:
            </p>
            <div className={styles.disclosureBox}>
              <strong className={styles.disclosureTitle}>
                ⚠️ Important Notice ({agentPrefs.avatarName} • {agentPrefs.toneName} Tone):
              </strong>
              <ol className={styles.disclosureList}>
                <li>
                  The agent will use <strong>Socratic questioning</strong>.
                </li>
                <li>
                  The agent may present arguments it does not itself &lsquo;believe&rsquo; in order
                  to test reasoning.
                </li>
                <li>
                  You should <strong>not treat the agent&apos;s statements as verified fact</strong>.
                </li>
              </ol>
            </div>
            <button onClick={handleCloseIntroModal} className={styles.modalPrimaryBtn}>
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
