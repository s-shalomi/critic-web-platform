export interface StageOverviewInfo {
  stageNumber: string;
  stageName: string;
  badge: string;
  whyImportant: string;
  overviewItems: Array<{
    title: string;
    description: string;
  }>;
}

export const STAGE_OVERVIEWS: Record<
  'familiarise' | 'conceptualise' | 'inquire' | 'synthesise',
  StageOverviewInfo
> = {
  familiarise: {
    stageNumber: '01',
    stageName: 'Annotate',
    badge: 'STAGE 01 • ANNOTATE',
    whyImportant:
      'Active annotation is the foundation of critical thinking. Rather than passively absorbing content, annotating trains you to spot unproven claims, unstated assumptions, rhetorical strategies, and potential author bias right at the source.',
    overviewItems: [
      {
        title: 'Explore Sources',
        description:
          'Use the left sidebar to navigate through diverse sources, posts, articles, and viewpoints.',
      },
      {
        title: 'Highlight & Annotate',
        description:
          'Select text on any source to highlight claims and record your notes on evidence and assumptions.',
      },
      {
        title: 'Convert to Node',
        description:
          'Click "+ Convert to node" on any note to send it straight to your Stage 02 Mind Map canvas.',
      },
      {
        title: 'AI Companion Hints',
        description:
          'Click your AI agent avatar in the bottom dock whenever you need a Socratic nudge or fresh perspective.',
      },
    ],
  },
  conceptualise: {
    stageNumber: '02',
    stageName: 'Mind Map',
    badge: 'STAGE 02 • MIND MAP',
    whyImportant:
      'Arguments are interconnected webs of claims, evidence, and logical leaps. Mind mapping transforms scattered thoughts into a clear visual structure, exposing logical gaps, contradictions, and missing justifications.',
    overviewItems: [
      {
        title: 'Review Highlights',
        description:
          'Browse your sources in the sidebar and hover over purple highlights to inspect your saved notes.',
      },
      {
        title: 'Create Concept Nodes (◯)',
        description:
          'Click the circle icon on the toolbar to add nodes representing key concepts identified from the text.',
      },
      {
        title: 'Link Nodes (╱)',
        description:
          'Select the line tool, then click two nodes in sequence to draw relationships between evidence and claims.',
      },
      {
        title: 'Pan & Organize (✋ / TT / 🗑️)',
        description:
          'Use the hand tool to pan or select nodes (which glow blue), edit node labels, or delete links and nodes.',
      },
    ],
  },
  inquire: {
    stageNumber: '03',
    stageName: 'Challenge',
    badge: 'STAGE 03 • CHALLENGE',
    whyImportant:
      'Ideas only become resilient knowledge when they survive rigorous scrutiny. Engaging in Socratic dialogue challenges confirmation bias, tests assumptions against alternative viewpoints, and evaluates evidence validity.',
    overviewItems: [
      {
        title: 'Inquire & Evaluate',
        description:
          'Chat with your AI peer to question assumptions, seek alternative viewpoints, and assess source credibility.',
      },
      {
        title: "Devil's Advocate Mode",
        description:
          'Engage with simulated counterarguments and misinformation claims to stress-test your reasoning.',
      },
      {
        title: 'Reference Your Map',
        description:
          'Keep your concept map in view on the right to ground your discussion in collected evidence and links.',
      },
      {
        title: 'Flexible Navigation',
        description:
          'Move between stages freely using the dock to gather more evidence or revise concepts as your thinking evolves.',
      },
    ],
  },
  synthesise: {
    stageNumber: '04',
    stageName: 'Conclude',
    badge: 'STAGE 04 • CONCLUDE',
    whyImportant:
      'A reasoned conclusion should be the thoughtful outcome of evidence evaluation, concept mapping, and critical debate. Synthesising your findings consolidates deep understanding and sharpens your analytical voice.',
    overviewItems: [
      {
        title: 'Formulate Your Conclusion',
        description:
          'Draft a reasoned synthesis reflecting on your annotations, concept map, and topic understanding.',
      },
      {
        title: 'AI Reasoning Audit',
        description:
          'Click "Audit" to let your AI agent cross-check your conclusion against unaddressed counterarguments and missing links.',
      },
      {
        title: 'Submit Module',
        description:
          'Click "Submit Module" to finalize your work and unlock your comprehensive reasoning profile and debrief statistics.',
      },
    ],
  },
};
