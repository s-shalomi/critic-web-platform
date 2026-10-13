'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './conceptualise.module.css';

import { getStudentStorageKey } from '@/shared/utils/storage';
import { reportStudentProgress } from '@/shared/utils/reportProgress';
import ConceptMapCanvas from '@/shared/components/ConceptMapCanvas/ConceptMapCanvas';
import {
  RobotAvatar,
  getStoredAgentPreferences,
  DEFAULT_AGENT_PREFERENCES,
  ResolvedAgentPreferences,
} from '@/shared/components/RobotAvatar/RobotAvatar';

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
  const [isSourcePanelCollapsed, setIsSourcePanelCollapsed] = useState<boolean>(false);

  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const notesKey = getStudentStorageKey('critic_notes', moduleId);
    setAgentPrefs(getStoredAgentPreferences());

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

  const handleCarouselScroll = () => {
    const container = carouselRef.current;
    if (!container || sources.length === 0) return;
    const cardWidth = container.clientWidth || 1;
    const idx = Math.round(container.scrollLeft / cardWidth);
    if (idx >= 0 && idx < sources.length && idx !== activeSourceIdx) {
      setActiveSourceIdx(idx);
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

      // Retrieve live concept nodes and links from client canvas storage
      const nodesKey = getStudentStorageKey('critic_nodes_canvas', moduleId);
      const linksKey = getStudentStorageKey('critic_links_canvas', moduleId);
      let localNodes: Array<{ text: string }> = [];
      let localLinks: any[] = [];
      try {
        const parsedNodes = JSON.parse(localStorage.getItem(nodesKey) || '[]');
        if (Array.isArray(parsedNodes))
          localNodes = parsedNodes.map((n: any) => ({ text: n.text || '' })).filter((n) => n.text);
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
      setAgentSpeech('How does this concept connect to the evidence you highlighted earlier?');
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
                <span className={styles.tooltipLabel}>NOTE {isPinned ? '📌 (PINNED)' : ''}</span>
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
      <div className={styles.workspace}>
        {/* Left Panel: Back Navigation, Mind Map Connections Heading, Source Carousel & Agent Dock */}
        <aside
          className={`${styles.leftSourcePanel} ${
            isSourcePanelCollapsed ? styles.leftSourcePanelCollapsed : ''
          }`}
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
                        <div key={src.id} className={styles.carouselSourceCard}>
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
          {/* Top-Right Action Bar (Tutorial & Help) */}
          <div className={styles.topRightActions}>
            <button
              type="button"
              onClick={() => setShowTutorialModal(true)}
              className={styles.tutorialBtn}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.5" stroke="#EAF6FF" strokeWidth="1.8" />
                <polygon points="10,8.5 16,12 10,15.5" fill="#EAF6FF" />
              </svg>
              <span>Tutorial</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className={styles.helpCircleBtn}
              aria-label="About Socratic AI Peer & Instructions"
              title="About Socratic AI Peer & Instructions"
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

          <ConceptMapCanvas moduleId={moduleId} stageTitle="conceptualise" />
        </div>
      </div>

      {/* Floating Stage Navigation Dock (matching Familiarise) */}
      <div className={styles.stageNavWrapper}>
        <nav className={styles.stageNavBar} aria-label="Module stages">
          <button
            type="button"
            onClick={() => router.push(`/module/${moduleId}/familiarise`)}
            className={styles.stageStep}
          >
            <span className={styles.stageCircle}>01</span>
            <span className={styles.stageLabel}>Annotate</span>
          </button>

          <button
            type="button"
            onClick={() => router.push(`/module/${moduleId}/conceptualise`)}
            className={`${styles.stageStep} ${styles.stageStepActive}`}
            aria-current="step"
          >
            <span className={`${styles.stageCircle} ${styles.stageCircleActive}`}>02</span>
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

      {/* Tutorial Modal */}
      {showTutorialModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowTutorialModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowTutorialModal(false)}
              className={styles.modalCloseBtn}
              aria-label="Close tutorial"
            >
              ✕
            </button>
            <h2 className={styles.modalTitle}>Stage 02: Mind Map Connections</h2>
            <p className={styles.modalLead}>
              Create nodes with the concepts you identified and link these concepts together to map
              out the argument structure.
            </p>
            <ol className={styles.tutorialStepsList}>
              <li>
                <strong>Review Your Highlights:</strong> Use the left card carousel (`◀` / `▶`) to
                browse sources and hover or click any purple highlight to view your saved notes.
              </li>
              <li>
                <strong>Create Concept Nodes (`◯`):</strong> Click the circle icon on the right
                toolbar to add a new concept node to the mind map canvas.
              </li>
              <li>
                <strong>Connect Concepts (`╱`):</strong> Select the diagonal line tool on the right
                toolbar, then click two nodes to link them with a glowing connection line.
              </li>
              <li>
                <strong>Edit (`TT`) or Delete (`🗑️`):</strong> Click a node to select it, then use
                the `TT` or Trash icons (or double-click any node) to refine your map.
              </li>
            </ol>
            <button onClick={() => setShowTutorialModal(false)} className={styles.modalPrimaryBtn}>
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Help / Socratic AI Disclosure Modal */}
      {showHelpModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowHelpModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowHelpModal(false)}
              className={styles.modalCloseBtn}
              aria-label="Close help"
            >
              ✕
            </button>
            <h2 className={styles.modalTitle}>About Your Socratic Companion</h2>
            <p className={styles.modalLead}>
              Click on <strong>{agentPrefs.avatarName}</strong> in the bottom-left corner at any
              time to receive a Socratic hint tailored to your{' '}
              <strong>{agentPrefs.toneName}</strong> tone preference.
            </p>
            <div className={styles.disclosureBox}>
              <strong className={styles.disclosureHeading}>
                🤖 About Your AI Peer (Socratic Role):
              </strong>
              <ul className={styles.disclosureList}>
                <li>
                  The AI acts as a <strong>Socratic questioning peer</strong> and{' '}
                  <strong>Devil&apos;s Advocate</strong>.
                </li>
                <li>
                  It may present counter-claims or perspectives it does not &ldquo;believe&rdquo; in
                  order to test and strengthen your reasoning.
                </li>
                <li>
                  Its statements are <strong>not authoritative facts</strong> — you are encouraged
                  to critically evaluate and challenge them.
                </li>
              </ul>
            </div>
            <button onClick={() => setShowHelpModal(false)} className={styles.modalPrimaryBtn}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
