/**
 * Review Domain Service
 * Calculates gamified student statistics dynamically based on active session data,
 * triggers sequential badge unlocks, and generates the MBTI-like reasoning summary card.
 */

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface ReviewData {
  moduleId: string;
  conceptsIdentified: number;
  assumptionsChallenged: number;
  questionsAsked: number;
  misinformationEvaluations: number;
  criticalThinkingScore: number;
  synthesisScore: number;
  mbtiPersonalityTitle: string;
  mbtiPersonalitySummary: string;
  badges: Badge[];
}

export async function generateModuleReview(
  moduleId: string,
  sessionStats?: {
    conceptsCount?: number;
    notesCount?: number;
    chatTurnsCount?: number;
    devilsAdvocateCount?: number;
    synthesisLength?: number;
  }
): Promise<ReviewData> {
  const conceptsCount = sessionStats?.conceptsCount ?? 4;
  const notesCount = sessionStats?.notesCount ?? 3;
  const chatTurns = sessionStats?.chatTurnsCount ?? 5;
  const misinfoCount = sessionStats?.devilsAdvocateCount ?? 2;
  const synthLen = sessionStats?.synthesisLength ?? 120;

  const criticalThinkingScore = Math.min(100, Math.max(50, 55 + notesCount * 6 + chatTurns * 3));
  const synthesisScore = Math.min(100, Math.max(50, 60 + Math.floor(synthLen / 10) + conceptsCount * 4));

  const badges: Badge[] = [
    {
      id: 'badge-concepts',
      title: 'Master Conceptualizer',
      description: `Identified ${conceptsCount} core concept nodes`,
      icon: '🧠',
      unlocked: true,
    },
    {
      id: 'badge-assumptions',
      title: 'Assumption Slayer',
      description: `Challenged ${notesCount} implicit biases`,
      icon: '🛡️',
      unlocked: true,
    },
    {
      id: 'badge-questions',
      title: 'Socratic Inquirer',
      description: `Asked ${chatTurns} probing questions`,
      icon: '❓',
      unlocked: true,
    },
    {
      id: 'badge-misinfo',
      title: 'Truth Auditor',
      description: `Evaluated ${misinfoCount} counter-claims`,
      icon: '🔍',
      unlocked: true,
    },
    {
      id: 'badge-critical',
      title: 'High-Velocity Reasoner',
      description: `Critical Thinking Score: ${criticalThinkingScore}/100`,
      icon: '⚡',
      unlocked: true,
    },
    {
      id: 'badge-synthesis',
      title: 'Synthesis Master',
      description: `Synthesis Quality Score: ${synthesisScore}/100`,
      icon: '🏆',
      unlocked: true,
    },
  ];

  // MBTI-like reasoning summary generation
  let mbtiPersonalityTitle = 'The Empiricist Investigator (E-S-R-T)';
  let mbtiPersonalitySummary =
    'You approach complex claims with rigorous empirical scrutiny. Rather than accepting rhetoric at face value, you systematically map conceptual links, interrogate underlying assumptions, and demand verified evidence before forming conclusions.';

  if (conceptsCount >= 5 && notesCount >= 4) {
    mbtiPersonalityTitle = 'The Systemic Architect (S-A-C-M)';
    mbtiPersonalitySummary =
      'You view complex problems as interconnected webs of cause and effect. You excel at synthesizing evidence into clear visual concept structures, identifying structural vulnerabilities in bad arguments, and formulating holistically sound conclusions.';
  } else if (chatTurns >= 6) {
    mbtiPersonalityTitle = 'The Socratic Questioner (S-Q-P-I)';
    mbtiPersonalitySummary =
      'You use targeted inquiry as your primary tool for discovery. Unafraid to challenge assumptions or probe counter-arguments, you uncover underlying truths by asking relentless, clarifying questions.';
  }

  return {
    moduleId,
    conceptsIdentified: conceptsCount,
    assumptionsChallenged: notesCount,
    questionsAsked: chatTurns,
    misinformationEvaluations: misinfoCount,
    criticalThinkingScore,
    synthesisScore,
    mbtiPersonalityTitle,
    mbtiPersonalitySummary,
    badges,
  };
}
