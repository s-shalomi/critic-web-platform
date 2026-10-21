import { TutorialStep } from '@/shared/components/TooltipTutorial/TooltipTutorial';

export type StageKey = 'familiarise' | 'conceptualise' | 'inquire' | 'synthesise';

export const STAGE_TUTORIAL_STEPS: Record<StageKey, TutorialStep[]> = {
  familiarise: [
    {
      targetSelector: '[data-tour="stage-dock"]',
      title: 'Stage Navigation',
      content: 'Use the bottom dock to move freely between stages as your thinking develops.',
      placement: 'top',
    },
    {
      targetSelector: '[data-tour="help-btn"]',
      title: 'Stage Overview (?)',
      content: "Click '?' anytime for a quick summary of why this stage matters and what to do.",
      placement: 'bottom',
    },
    {
      targetSelector: '[data-tour="sidebar-sources"]',
      title: 'Evidence Sources',
      content: 'Explore the sources in this sidebar to investigate different claims and perspectives.',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="source-reading"]',
      title: 'Highlight & Annotate',
      content: 'Select text in the source to highlight key claims and write your notes.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="source-reading"]',
      title: 'Manage Notes & Nodes',
      content:
        'Hover over or click highlighted text to edit or delete your note, or convert it to a concept node.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="agent-dock"]',
      title: 'AI Agent Hints',
      content: 'Click your AI agent companion in the dock whenever you need a helpful hint.',
      placement: 'top',
    },
  ],

  conceptualise: [
    {
      targetSelector: '[data-tour="sources-sidebar"]',
      title: 'Sources & Notes',
      content:
        'Scroll through your sources here. Hover or click on highlights to view notes and click "+ Convert to node" to add them to your canvas.',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="tool-pan"]',
      title: 'Pan & Select (✋)',
      content: 'Use the hand tool to pan around the canvas or select a node.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="concept-node"]',
      title: 'Edit & Delete Nodes',
      content: 'Select a node to edit and delete it (selected nodes glow blue).',
      placement: 'auto',
    },
    {
      targetSelector: '[data-tour="tool-node"]',
      title: 'Create Node (◯)',
      content:
        'Click the circle icon to add a new node for key concepts identified in the text.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="tool-link"]',
      title: 'Link Nodes (╱)',
      content:
        'Click the line icon, then select two nodes in sequence to draw a connection between them.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="tool-zoom"]',
      title: 'Zoom (+ / −)',
      content: 'Use the plus and minus buttons to zoom in and out of your map.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="collapse-btn"]',
      title: 'Collapse Sidebar',
      content: 'Collapse this sidebar to give yourself more canvas workspace.',
      placement: 'right',
    },
  ],

  inquire: [
    {
      targetSelector: '[data-tour="chat-panel"]',
      title: 'Inquire & Evaluate',
      content:
        'Chat with the AI agent to question assumptions, explore alternative viewpoints, and assess evidence credibility.',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="concept-canvas"]',
      title: 'Concept Map Reference',
      content:
        'Interact with and reference your concept nodes on the canvas while questioning assumptions.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="stage-dock"]',
      title: 'Stage Navigation',
      content: 'Navigate back to earlier stages to gather more evidence, or proceed when ready.',
      placement: 'top',
    },
  ],

  synthesise: [
    {
      targetSelector: '[data-tour="conclusion-box"]',
      title: 'Final Conclusion',
      content:
        'Write your final conclusion reflecting on your notes, concept map, and overall topic understanding.',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="audit-btn"]',
      title: 'AI Reasoning Audit',
      content:
        "Click 'Audit' to have the AI agent review your conclusion and suggest anything else to consider.",
      placement: 'top',
    },
    {
      targetSelector: '[data-tour="submit-btn"]',
      title: 'Complete Module',
      content:
        "Click 'Submit Module' when you're finished to complete the module and review your stats.",
      placement: 'top',
    },
  ],
};
