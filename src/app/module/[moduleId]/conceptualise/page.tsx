'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './conceptualise.module.css';

import {
  getStudentStorageKey,
  hasSeenModuleDisclosure,
  markModuleDisclosureSeen,
  hasSeenStageTutorial,
  markStageTutorialSeen,
} from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';
import ConceptMapCanvas from '@/shared/components/ConceptMapCanvas/ConceptMapCanvas';
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
import { StageNavigationDock } from '@/shared/components/StageNavigationDock/StageNavigationDock';

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

function getAuthorInitials(name?: string): string {
  if (!name) return 'SR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ConceptualiseStagePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = (params?.moduleId as string) || 'mod_climate_change_demo';

  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showOverviewModal, setShowOverviewModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [agentSpeech, setAgentSpeech] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState<boolean>(false);
  const [agentPrefs, setAgentPrefs] = useState<ResolvedAgentPreferences>(DEFAULT_AGENT_PREFERENCES);

  // Left Sources & Notes State
  const [sources, setSources] = useState<Source[]>([]);
  const [activeSourceIdx, setActiveSourceIdx] = useState<number>(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [pinnedNoteId, setPinnedNoteId] = useState<string | null>(null);
  const [convertingNoteId, setConvertingNoteId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placeBelow: boolean } | null>(null);
  const hoverLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSourcePanelCollapsed, setIsSourcePanelCollapsed] = useState<boolean>(false);
  const [socraticCount, setSocraticCount] = useState<number>(0);

  const carouselRef = useRef<HTMLDivElement>(null);

  const handleCloseHelpModal = () => {
    setShowHelpModal(false);
    if (!hasSeenStageTutorial(moduleId, 'conceptualise')) {
      setShowTutorialModal(true);
    }
  };

  const handleCloseTutorial = () => {
    setShowTutorialModal(false);
    markStageTutorialSeen(moduleId, 'conceptualise');
  };

  useEffect(() => {
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    const socraticKey = getStudentStorageKey('critic_socratic_count_conceptualise', moduleId);
    const initialSocratic = parseInt(localStorage.getItem(socraticKey) || '0', 10);
    setSocraticCount(initialSocratic);

    setAgentPrefs(getStoredAgentPreferences());

    // Show mandatory AI disclosure automatically once when the student first enters the module
    if (!hasSeenModuleDisclosure(moduleId)) {
      setShowHelpModal(true);
      markModuleDisclosureSeen(moduleId);
    } else if (!hasSeenStageTutorial(moduleId, 'conceptualise')) {
      setShowTutorialModal(true);
    }

    // Inform teacher portal this student is on the Conceptualise stage
    reportStudentProgress('conceptualise');

    // 1. Fetch Sources with live syncing
    const fetchSources = () => {
      setAgentPrefs(getStoredAgentPreferences());
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

    // 2. Fetch Notes with Canvas sync verification
    const syncNotesWithCanvas = (currentNotes: Note[]) => {
      const canvasNodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
      const savedCanvas = localStorage.getItem(canvasNodesKey);
      if (!savedCanvas) return currentNotes;
      try {
        const canvasNodes: Array<{ id: string; sourceNoteId?: string; text: string }> =
          JSON.parse(savedCanvas);
        return currentNotes.map((note) => {
          if (!note.convertedToNode) return note;
          const hasNode = canvasNodes.some(
            (cn) =>
              (cn.sourceNoteId && cn.sourceNoteId === note.id) ||
              cn.text === note.noteText ||
              cn.text === note.highlightedText
          );
          return hasNode ? note : { ...note, convertedToNode: false };
        });
      } catch (e) {
        return currentNotes;
      }
    };

    const loadAndSyncNotes = () => {
      const localSavedNotes = localStorage.getItem(notesKey);
      if (localSavedNotes) {
        try {
          const parsed = JSON.parse(localSavedNotes);
          const verified = syncNotesWithCanvas(parsed);
          setNotes(verified);
        } catch (e) {
          console.error(e);
        }
      }
    };

    loadAndSyncNotes();
    fetch(`/api/modules/${moduleId}/notes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notes && data.notes.length > 0) {
          const verified = syncNotesWithCanvas(data.notes);
          setNotes(verified);
          localStorage.setItem(notesKey, JSON.stringify(verified));
        }
      })
      .catch((err) => console.error(err));

    window.addEventListener('focus', loadAndSyncNotes);
    window.addEventListener('critic_canvas_sync', loadAndSyncNotes);
    window.addEventListener('critic_notes_updated', loadAndSyncNotes);

    return () => {
      clearInterval(sourcesInterval);
      window.removeEventListener('focus', fetchSources);
      window.removeEventListener('focus', loadAndSyncNotes);
      window.removeEventListener('critic_canvas_sync', loadAndSyncNotes);
      window.removeEventListener('critic_notes_updated', loadAndSyncNotes);
    };
  }, [moduleId]);

  const scrollToSourceIndex = (idx: number) => {
    if (sources.length === 0) return;
    const boundedIdx = ((idx % sources.length) + sources.length) % sources.length;
    setActiveSourceIdx(boundedIdx);
    const container = carouselRef.current;
    if (container) {
      const cards = container.querySelectorAll(`.${styles.carouselSourceCard}`);
      const targetCard = cards[boundedIdx] as HTMLElement | undefined;
      if (targetCard) {
        container.scrollTo({
          left: targetCard.offsetLeft - container.offsetLeft,
          behavior: 'smooth',
        });
      }
    }
  };

  const calculateTooltipPosition = (targetEl: HTMLElement) => {
    const rect = targetEl.getBoundingClientRect();
    const tooltipWidth = 280;
    const placeBelow = rect.top < 180;
    const top = placeBelow ? rect.bottom + 8 : rect.top - 8;
    const idealLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, idealLeft));
    return { top, left, placeBelow };
  };

  const handleHighlightMouseEnter = (noteId: string, el: HTMLElement) => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    if (!pinnedNoteId) {
      setHoveredNoteId(noteId);
      setTooltipPos(calculateTooltipPosition(el));
    }
  };

  const handleHighlightMouseLeave = (noteId: string) => {
    if (!pinnedNoteId) {
      hoverLeaveTimerRef.current = setTimeout(() => {
        setHoveredNoteId(null);
        setTooltipPos(null);
      }, 180);
    }
  };

  const handleHighlightClick = (noteId: string, el: HTMLElement) => {
    if (pinnedNoteId === noteId) {
      setPinnedNoteId(null);
      setHoveredNoteId(null);
      setTooltipPos(null);
    } else {
      setPinnedNoteId(noteId);
      setHoveredNoteId(noteId);
      setTooltipPos(calculateTooltipPosition(el));
    }
  };

  const handleCardScroll = () => {
    if (pinnedNoteId) {
      const el = document.querySelector(`[data-note-id="${pinnedNoteId}"]`) as HTMLElement | null;
      if (el) {
        setTooltipPos(calculateTooltipPosition(el));
      } else {
        setPinnedNoteId(null);
        setHoveredNoteId(null);
        setTooltipPos(null);
      }
    }
  };

  const handleConvertToNode = async (noteId: string) => {
    if (convertingNoteId) return;
    setConvertingNoteId(noteId);

    const targetNote = notes.find((n) => n.id === noteId);

    // 1. Optimistically update local notes
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    const updatedNotes = notes.map((n) => (n.id === noteId ? { ...n, convertedToNode: true } : n));
    setNotes(updatedNotes);
    localStorage.setItem(notesKey, JSON.stringify(updatedNotes));

    // 2. Create concept node for Mind Map Canvas
    const conceptNodeToSave = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      moduleId,
      text: targetNote ? targetNote.noteText || targetNote.highlightedText : 'Key Concept',
      positionX: 200 + Math.floor(Math.random() * 200),
      positionY: 150 + Math.floor(Math.random() * 150),
      sourceNoteId: noteId,
      linkCount: 0,
    };

    const canvasNodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
    const savedCanvasNodesStr = localStorage.getItem(canvasNodesKey);
    const canvasNodes = savedCanvasNodesStr ? JSON.parse(savedCanvasNodesStr) : [];
    canvasNodes.push(conceptNodeToSave);
    localStorage.setItem(canvasNodesKey, JSON.stringify(canvasNodes));

    // 3. Dispatch sync event so ConceptMapCanvas instantly renders the new node
    window.dispatchEvent(new Event('critic_canvas_sync'));

    // 4. Show success toast notification
    setToastMsg('✨ Note converted to Concept Node! Added to Mind Map.');
    setTimeout(() => setToastMsg(null), 3500);

    // 5. Persist to server API
    try {
      await fetch(`/api/notes/${noteId}/convert-to-node`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Error persisting note conversion:', err);
    } finally {
      setConvertingNoteId(null);
    }
  };

  const handleCarouselScroll = () => {
    const container = carouselRef.current;
    if (!container || sources.length === 0) return;
    const cardWidth = container.clientWidth || 1;
    const idx = Math.round(container.scrollLeft / cardWidth);
    if (idx >= 0 && idx < sources.length && idx !== activeSourceIdx) {
      setActiveSourceIdx(idx);
    }
    if (pinnedNoteId) {
      const el = document.querySelector(`[data-note-id="${pinnedNoteId}"]`) as HTMLElement | null;
      if (el) {
        setTooltipPos(calculateTooltipPosition(el));
      } else {
        setPinnedNoteId(null);
        setHoveredNoteId(null);
        setTooltipPos(null);
      }
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

      const socraticKey = getStudentStorageKey('critic_socratic_count_conceptualise', moduleId);
      const currentSocratic = parseInt(localStorage.getItem(socraticKey) || '0', 10);
      const nextSocratic = currentSocratic + 1;
      localStorage.setItem(socraticKey, String(nextSocratic));
      setSocraticCount(nextSocratic);
      window.dispatchEvent(new Event('critic_socratic_sync'));

      // Retrieve live concept nodes and links from client canvas storage
      const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
      const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);
      let localNodes: Array<{ id?: string; text: string }> = [];
      let localLinks: any[] = [];
      try {
        const parsedNodes = JSON.parse(localStorage.getItem(nodesKey) || '[]');
        if (Array.isArray(parsedNodes))
          localNodes = parsedNodes
            .map((n: any) => ({ id: n.id, text: n.text || '' }))
            .filter((n) => n.text);
        const parsedLinks = JSON.parse(localStorage.getItem(linksKey) || '[]');
        if (Array.isArray(parsedLinks)) localLinks = parsedLinks;
      } catch (e) {
        /* ignore parse error */
      }

      const activeSource = sources[activeSourceIdx] || sources[0];
      const res = await fetch(`/api/modules/${moduleId}/agent/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'conceptualise',
          sourceTitle: activeSource?.title,
          sourceText: activeSource?.content?.text,
          notes: notes.map((n) => ({
            highlightedText: n.highlightedText,
            noteText: n.noteText,
          })),
          conceptNodes: localNodes,
          conceptLinks: localLinks,
          agentPersonality: `${agentPrefs.toneName} (${agentPrefs.toneDesc})`,
          avatarName: agentPrefs.avatarName,
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
      setAgentSpeech(getStageOpener('conceptualise', agentPrefs.toneName));
    } finally {
      setAgentLoading(false);
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
      const isPinned = pinnedNoteId === n.id;
      const isHovered = hoveredNoteId === n.id;

      return (
        <span
          key={index}
          data-note-id={n.id}
          className={`${styles.highlightedSpan} ${isPinned ? styles.pinnedSpan : ''} ${
            isHovered ? styles.hoveredSpan : ''
          }`}
          onMouseEnter={(e) => handleHighlightMouseEnter(n.id, e.currentTarget)}
          onMouseLeave={() => handleHighlightMouseLeave(n.id)}
          onClick={(e) => {
            e.stopPropagation();
            handleHighlightClick(n.id, e.currentTarget);
          }}
          title={isPinned ? 'Click to unpin note' : 'Click to pin note'}
        >
          {part.text}
        </span>
      );
    });
  };

  const activeTooltipNote = notes.find((n) => n.id === (pinnedNoteId || hoveredNoteId));
  const isPinned = Boolean(pinnedNoteId && activeTooltipNote?.id === pinnedNoteId);

  return (
    <div
      className={styles.container}
      onClick={() => {
        if (pinnedNoteId) {
          setPinnedNoteId(null);
          setHoveredNoteId(null);
          setTooltipPos(null);
        }
      }}
    >
      <div className={styles.workspace}>
        {/* Left Panel: Back Navigation, Mind Map Connections Heading, Source Carousel & Agent Dock */}
        <aside
          className={`${styles.leftSourcePanel} ${
            isSourcePanelCollapsed ? styles.leftSourcePanelCollapsed : ''
          }`}
          data-tour="sources-sidebar"
        >
          <div className={styles.topHeaderRow}>
            {!isSourcePanelCollapsed && (
              <button onClick={() => router.push('/dashboard')} className={styles.backBtn}>
                <svg
                  width="20"
                  height="20"
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
            )}

            <button
              onClick={() => setIsSourcePanelCollapsed(!isSourcePanelCollapsed)}
              className={styles.collapseToggleBtn}
              data-tour="collapse-btn"
              title={
                isSourcePanelCollapsed
                  ? 'Expand Evidence Sources Panel'
                  : 'Collapse Panel for Full-Width Mind Map'
              }
            >
              {isSourcePanelCollapsed ? '▶' : '◀'}
            </button>
          </div>

          {!isSourcePanelCollapsed && (
            <>
              <h1 className={styles.sidebarHeading}>Mind Map Connections</h1>

              {/* Source Carousel with Left/Right Arrows & Pagination Dots */}
              <div className={styles.carouselSection}>
                <div className={styles.carouselRow}>
                  <button
                    type="button"
                    onClick={() => scrollToSourceIndex(activeSourceIdx - 1)}
                    className={styles.carouselArrowBtn}
                    aria-label="Previous source"
                    disabled={sources.length <= 1}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  <div
                    ref={carouselRef}
                    onScroll={handleCarouselScroll}
                    className={styles.horizontalSourcesCarousel}
                  >
                    {sources.map((src) => {
                      const displayAuthor = src.content.authorName || src.title;
                      const initials = getAuthorInitials(displayAuthor);

                      return (
                        <div
                          key={src.id}
                          className={styles.carouselSourceCard}
                          onScroll={handleCardScroll}
                        >
                          <div className={styles.carouselCardContent}>
                            <div className={styles.authorHeader}>
                              <div className={styles.authorAvatar}>{initials}</div>
                              <div className={styles.authorMeta}>
                                <span className={styles.authorName}>{displayAuthor}</span>
                                {src.content.authorName && src.title !== src.content.authorName && (
                                  <span className={styles.sourceCardBadge}>{src.title}</span>
                                )}
                              </div>
                            </div>

                            <div className={styles.sourceText}>
                              {renderHighlightedText(src.id, src.content.text)}

                              {src.content.comments && src.content.comments.length > 0 && (
                                <div className={styles.commentsSection}>
                                  <h5 className={styles.commentsHeading}>Comments</h5>
                                  {src.content.comments.map((c, i) => (
                                    <div key={i} className={styles.commentItem}>
                                      <strong className={styles.commentAuthor}>{c.author}:</strong>{' '}
                                      {renderHighlightedText(src.id, c.text)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollToSourceIndex(activeSourceIdx + 1)}
                    className={styles.carouselArrowBtn}
                    aria-label="Next source"
                    disabled={sources.length <= 1}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>

                {/* Pagination Dots matching screens_v2/conceptualise.png */}
                {sources.length > 0 && (
                  <div className={styles.carouselDots} role="tablist" aria-label="Evidence sources">
                    {sources.map((src, idx) => (
                      <button
                        key={src.id}
                        type="button"
                        role="tab"
                        aria-selected={idx === activeSourceIdx}
                        aria-label={`View source ${idx + 1}: ${src.title}`}
                        onClick={() => scrollToSourceIndex(idx)}
                        className={`${styles.carouselDot} ${
                          idx === activeSourceIdx ? styles.carouselDotActive : ''
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Companion Robot Avatar Dock at Bottom-Left */}
              <div className={styles.agentDock}>
                {agentLoading && (
                  <div className={styles.loadingSpeechBubble}>
                    <div className={styles.spinnerSmall} />
                    <span className={styles.loadingBubbleText}>
                      {agentPrefs.avatarName} ({agentPrefs.toneName}) is analyzing your concept map...
                    </span>
                  </div>
                )}

                {!agentLoading && agentSpeech && (
                  <div className={styles.speechBubble}>
                    <div className={styles.speechHeader}>
                      <span className={styles.speechToneTag}>
                        {agentPrefs.avatarName} • {agentPrefs.toneName}
                      </span>
                      <button
                        onClick={() => setAgentSpeech(null)}
                        className={styles.closeSpeechBtn}
                        aria-label="Dismiss hint"
                      >
                        ✕
                      </button>
                    </div>
                    <p className={styles.speechText}>{agentSpeech}</p>
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
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAgentClick}
                  disabled={agentLoading}
                  className={`${styles.agentAvatarBtn} ${
                    agentLoading ? styles.agentAvatarBtnLoading : ''
                  }`}
                  title={`Click ${agentPrefs.avatarName} (${agentPrefs.toneName} tone) for Socratic Hint`}
                >
                  <RobotAvatar variant={agentPrefs.appearance} size={136} />
                </button>

                <button
                  type="button"
                  onClick={handleAgentClick}
                  className={styles.agentMetaPill}
                  title="Click for a Socratic question in your selected tone"
                >
                  <span className={styles.agentMetaName}>{agentPrefs.avatarName}</span>
                  <span className={styles.agentMetaDivider}>•</span>
                  <span className={styles.agentMetaTone}>Tone: {agentPrefs.toneName}</span>
                </button>
              </div>
            </>
          )}
        </aside>

        {/* Right Interactive Concept Map Canvas Area */}
        <div className={styles.rightCanvasWrapper}>
          {/* Top-Right Action Bar (AI Disclosure, Tutorial & Help) */}
          <div className={styles.topRightActions}>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className={styles.disclosureBtn}
              aria-label="AI Disclosure"
              title="View AI Agent Disclosure"
            >
              <svg
                width="16"
                height="16"
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.5" stroke="#EAF6FF" strokeWidth="1.8" />
                <polygon points="10,8.5 16,12 10,15.5" fill="#EAF6FF" />
              </svg>
              <span>Tutorial</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOverviewModal(true)}
              className={styles.helpCircleBtn}
              data-tour="help-btn"
              aria-label="Help"
              title="Stage Overview: Why Mind Mapping Matters"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.5" stroke="#EAF6FF" strokeWidth="1.8" />
                <path
                  d="M9.5 9.5C9.5 8.12 10.62 7 12 7C13.38 7 14.5 8.12 14.5 9.5C14.5 10.65 13.72 11.62 12.66 11.91C12.26 12.02 12 12.38 12 12.8V13.5"
                  stroke="#EAF6FF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16.5" r="1" fill="#EAF6FF" />
              </svg>
            </button>
          </div>

          <ConceptMapCanvas
            moduleId={moduleId}
            stageTitle="conceptualise"
            onNodesChange={(currentCanvasNodes) => {
              setNotes((prevNotes) => {
                const updated = prevNotes.map((note) => {
                  if (!note.convertedToNode) return note;
                  const hasNode = currentCanvasNodes.some(
                    (cn) =>
                      (cn.sourceNoteId && cn.sourceNoteId === note.id) ||
                      cn.text === note.noteText ||
                      cn.text === note.highlightedText
                  );
                  return hasNode ? note : { ...note, convertedToNode: false };
                });
                const notesKey = getStudentStorageKey('critic_notes', moduleId);
                localStorage.setItem(notesKey, JSON.stringify(updated));
                return updated;
              });
            }}
          />
        </div>
      </div>

      {/* Floating Stage Navigation Dock with Dynamic Stage Transition Indicators */}
      <StageNavigationDock currentStage="conceptualise" moduleId={moduleId} />

      {/* Interactive Tooltip Onboarding Tutorial */}
      <TooltipTutorial
        stageName="Mind Map"
        steps={STAGE_TUTORIAL_STEPS.conceptualise}
        isOpen={showTutorialModal}
        onClose={handleCloseTutorial}
        onComplete={handleCloseTutorial}
      />

      {/* Stage Overview Modal (? Button) */}
      <StageOverviewModal
        stage="conceptualise"
        isOpen={showOverviewModal}
        onClose={() => setShowOverviewModal(false)}
      />

      {/* Mandatory AI Disclosure Modal */}
      {showHelpModal && (
        <div className={styles.modalBackdrop} onClick={handleCloseHelpModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseHelpModal}
              className={styles.modalCloseBtn}
              aria-label="Close disclosure"
            >
              ✕
            </button>
            <h2 className={styles.modalTitle}>AI Agent Disclosure</h2>
            <p className={styles.modalLead}>
              Before interacting with <strong>{agentPrefs.avatarName}</strong> ({agentPrefs.toneName}{' '}
              tone) in this module, please note how the AI peer operates:
            </p>
            <div className={styles.disclosureBox}>
              <strong className={styles.disclosureHeading}>
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
            <button onClick={handleCloseHelpModal} className={styles.modalPrimaryBtn}>
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Anchored, Non-overflowing Note Tooltip Popover */}
      {activeTooltipNote && tooltipPos && (
        <div
          className={styles.hoverTooltipFixed}
          style={{
            top: `${tooltipPos.top}px`,
            left: `${tooltipPos.left}px`,
            transform: tooltipPos.placeBelow ? 'none' : 'translateY(-100%)',
          }}
          onMouseEnter={() => {
            if (hoverLeaveTimerRef.current) {
              clearTimeout(hoverLeaveTimerRef.current);
              hoverLeaveTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            if (!pinnedNoteId) {
              setHoveredNoteId(null);
              setTooltipPos(null);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.tooltipHeader}>
            <span className={styles.tooltipLabel}>
              NOTE {isPinned ? '📌 (PINNED)' : ''}
            </span>
            {isPinned && (
              <button
                type="button"
                onClick={() => {
                  setPinnedNoteId(null);
                  setHoveredNoteId(null);
                  setTooltipPos(null);
                }}
                className={styles.closeTooltipBtn}
                aria-label="Close note"
              >
                ✕
              </button>
            )}
          </div>

          <p className={styles.tooltipNoteText}>{activeTooltipNote.noteText}</p>

          <div className={styles.tooltipFooter}>
            {activeTooltipNote.convertedToNode ? (
              <span className={styles.convertedBadge}>✓ Converted to Concept Node</span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConvertToNode(activeTooltipNote.id);
                }}
                disabled={convertingNoteId === activeTooltipNote.id}
                className={`${styles.convertTooltipBtn} ${
                  convertingNoteId === activeTooltipNote.id ? styles.convertTooltipBtnLoading : ''
                }`}
                title="Convert this note into a Concept Node on your Mind Map"
              >
                {convertingNoteId === activeTooltipNote.id ? (
                  <span className={styles.inlineSpinnerRow}>
                    <span className={styles.spinnerMini} />
                    Creating Node...
                  </span>
                ) : (
                  '+ Convert to node'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {toastMsg && <div className={styles.toastBanner}>{toastMsg}</div>}
    </div>
  );
}
