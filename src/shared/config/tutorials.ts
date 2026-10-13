import { TutorialStep } from '@/shared/components/TooltipTutorial/TooltipTutorial';

export type StageKey = 'familiarise' | 'conceptualise' | 'inquire' | 'synthesise';

export const STAGE_TUTORIAL_STEPS: Record<StageKey, TutorialStep[]> = {
  familiarise: [
    {
      targetSelector: '[data-tour="stage-dock"]',
      title: 'Navigation Dock',
      content: 'The dock is to be used for navigation and moving back and forth between stages.',
      placement: 'top',
    },
    {
      targetSelector: '[data-tour="help-btn"]',
      title: 'Stage Overview (?)',
      content:
        "The '?' button explains why each stage is important and gives a brief overview of what to do in the stage.",
      placement: 'bottom',
    },
    {
      targetSelector: '[data-tour="sidebar-sources"]',
      title: 'Evidence Sources',
      content: 'The sidebar on the side contains sources to be explored.',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="source-reading"]',
      title: 'Highlight & Annotate',
      content: 'Text on a source can be highlighted and an annotation can be made.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="agent-dock"]',
      title: 'AI Agent Hints',
      content: 'The AI agent can be used for hints when the user is stuck.',
      placement: 'top',
    },
  ],

  conceptualise: [
    {
      targetSelector: '[data-tour="sources-sidebar"]',
      title: 'Sources & Notes',
      content:
        'The sidebar contains the sources. The user can scroll through these and hover on highlights to see the notes they made.',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="tool-pan"]',
      title: 'Pan & Select (✋)',
      content:
        'The hand icon can be used to pan or select a node. Selected nodes glow blue and can be edited or deleted.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="tool-node"]',
      title: 'Create Node (◯)',
      content:
        'The circle icon can be used to create a node. These are key concepts identified from the text.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="tool-link"]',
      title: 'Link Nodes (╱)',
      content:
        'The line icon can be used to create links between nodes. After selecting the line, select a node and then another node to link it with.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="tool-zoom"]',
      title: 'Zoom Controls (+ / −)',
      content: 'The plus and minus allow for zooming in and out.',
      placement: 'left',
    },
    {
      targetSelector: '[data-tour="collapse-btn"]',
      title: 'Collapse Sidebar',
      content: 'The sidebar can be collapsed.',
      placement: 'right',
    },
  ],

  inquire: [
    {
      targetSelector: '[data-tour="chat-panel"]',
      title: 'Inquire & Evaluate',
      content:
        'Users can chat with the AI agent to inquire about and evaluate the sources: question assumptions, seek alternative viewpoints, and assess evidence credibility, reliability and validity.',
      placement: 'right',
    },
  ],

  synthesise: [
    {
      targetSelector: '[data-tour="conclusion-box"]',
      title: 'Final Conclusion',
      content:
        'Users create a final conclusion after reflecting on the process. It is based on their annotations, concept map and understanding of the topic.',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="audit-btn"]',
      title: 'AI Reasoning Audit',
      content:
        "The 'audit' button lets the AI agent cross check the conclusion to see if there's anything else the user can consider.",
      placement: 'top',
    },
    {
      targetSelector: '[data-tour="submit-btn"]',
      title: 'Complete Module',
      content: "The 'submit' button lets the user complete the module.",
      placement: 'top',
    },
  ],
};
