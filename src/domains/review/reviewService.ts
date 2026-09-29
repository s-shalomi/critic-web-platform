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

import { reviewStatsStore } from '@/shared/db/sessionStore';

export async function getExistingModuleReview(moduleId: string): Promise<ReviewData | null> {
  return reviewStatsStore.get(moduleId) || null;
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
  const conceptsCount = sessionStats?.conceptsCount ?? 0;
  const notesCount = sessionStats?.notesCount ?? 0;
  const chatTurns = sessionStats?.chatTurnsCount ?? 0;
  const misinfoCount = sessionStats?.devilsAdvocateCount ?? 0;
  const synthLen = sessionStats?.synthesisLength ?? 0;

  const criticalThinkingScore = Math.min(100, Math.max(50, 50 + notesCount * 8 + chatTurns * 4));
  const synthesisScore = Math.min(100, Math.max(50, 55 + Math.floor(synthLen / 12) + conceptsCount * 5));

  const badges: Badge[] = [
    {
      id: 'badge-concepts',
      title: 'Master Conceptualizer',
      description: `Identified ${conceptsCount} concept node${conceptsCount === 1 ? '' : 's'}`,
      icon: '🧠',
      unlocked: conceptsCount > 0,
    },
    {
      id: 'badge-assumptions',
      title: 'Assumption Slayer',
      description: `Challenged ${notesCount} implicit bias${notesCount === 1 ? '' : 'es'}`,
      icon: '🛡️',
      unlocked: notesCount > 0,
    },
    {
      id: 'badge-questions',
      title: 'Socratic Inquirer',
      description: `Asked ${chatTurns} probing question${chatTurns === 1 ? '' : 's'}`,
      icon: '❓',
      unlocked: chatTurns > 0,
    },
    {
      id: 'badge-misinfo',
      title: 'Truth Auditor',
      description: `Evaluated ${misinfoCount} counter-claim${misinfoCount === 1 ? '' : 's'}`,
      icon: '🔍',
      unlocked: misinfoCount > 0 || notesCount > 0,
    },
    {
      id: 'badge-critical',
      title: 'High-Velocity Reasoner',
      description: `Critical Thinking Score: ${criticalThinkingScore}/100`,
      icon: '⚡',
      unlocked: criticalThinkingScore >= 55,
    },
    {
      id: 'badge-synthesis',
      title: 'Synthesis Master',
      description: `Synthesis Quality Score: ${synthesisScore}/100`,
      icon: '🏆',
      unlocked: synthesisScore >= 60,
    },
  ];

  let mbtiPersonalityTitle = 'The Empiricist Investigator (E-S-R-T)';
  let mbtiPersonalitySummary =
    'You approach complex claims with rigorous empirical scrutiny. Rather than accepting rhetoric at face value, you systematically map conceptual links, interrogate underlying assumptions, and demand verified evidence before forming conclusions.';

  if (conceptsCount >= 3 && notesCount >= 3) {
    mbtiPersonalityTitle = 'The Systemic Architect (S-A-C-M)';
    mbtiPersonalitySummary =
      'You view complex problems as interconnected webs of cause and effect. You excel at synthesizing evidence into clear visual concept structures, identifying structural vulnerabilities in bad arguments, and formulating holistically sound conclusions.';
  } else if (chatTurns >= 3) {
    mbtiPersonalityTitle = 'The Socratic Questioner (S-Q-P-I)';
    mbtiPersonalitySummary =
      'You use targeted inquiry as your primary tool for discovery. Unafraid to challenge assumptions or probe counter-arguments, you uncover underlying truths by asking relentless, clarifying questions.';
  }

  const reviewResult: ReviewData = {
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

  reviewStatsStore.set(moduleId, reviewResult);
  return reviewResult;
}
