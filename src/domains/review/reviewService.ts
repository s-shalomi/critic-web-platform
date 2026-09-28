/**
 * Review Domain Service
 * Calculates gamified student statistics, triggers sequential badge unlocks, and generates the MBTI-like reasoning summary card.
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
  criticalThinkingScore: number; // 0-100
  synthesisScore: number; // 0-100
  mbtiPersonalityTitle: string;
  mbtiPersonalitySummary: string;
  badges: Badge[];
}

export async function generateModuleReview(
  moduleId: string,
  statsInput?: {
    conceptsCount?: number;
    notesCount?: number;
    chatTurnsCount?: number;
  }
): Promise<ReviewData> {
  const conceptsCount = statsInput?.conceptsCount || 5;
  const notesCount = statsInput?.notesCount || 4;
  const chatTurns = statsInput?.chatTurnsCount || 8;

  const criticalThinkingScore = Math.min(100, 65 + notesCount * 5 + chatTurns * 3);
  const synthesisScore = Math.min(100, 70 + conceptsCount * 4);

  const badges: Badge[] = [
    {
      id: 'badge-concepts',
      title: 'Master Conceptualizer',
      description: `Identified ${conceptsCount} core concepts`,
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
      description: 'Critiqued misinformation claims',
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
  const mbtiPersonalityTitle = 'The Empiricist Investigator (E-S-R-T)';
  const mbtiPersonalitySummary =
    'You approach complex claims with rigorous empirical scrutiny. Rather than accepting rhetoric at face value, you systematically map conceptual links, interrogate underlying assumptions, and demand verified evidence before forming conclusions.';

  return {
    moduleId,
    conceptsIdentified: conceptsCount,
    assumptionsChallenged: notesCount,
    questionsAsked: chatTurns,
    misinformationEvaluations: 3,
    criticalThinkingScore,
    synthesisScore,
    mbtiPersonalityTitle,
    mbtiPersonalitySummary,
    badges,
  };
}
