/**
 * Review Domain Service
 * Calculates gamified student statistics dynamically based on active session data,
 * triggers sequential badge unlocks, and generates the MBTI-like reasoning summary card.
 */

import Groq from 'groq-sdk';
import https from 'https';
import { reviewStatsStore, saveStoreToDisk } from '@/shared/db/sessionStore';

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

export interface ReviewSessionInput {
  conceptsCount?: number;
  notesCount?: number;
  chatTurnsCount?: number;
  devilsAdvocateCount?: number;
  synthesisLength?: number;
  notes?: Array<{ highlightedText: string; noteText: string }>;
  conceptNodes?: Array<{ text: string }>;
  chatMessages?: Array<{ sender: string; text: string }>;
  synthesisText?: string;
  agentPersonality?: string;
  avatarName?: string;
}

const insecureHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

function getSanitizedGroqKey(): string | undefined {
  const raw = process.env.GROQ_API_KEY;
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^["']|["']$/g, '');
  if (!cleaned || cleaned === 'your_groq_api_key') return undefined;
  return cleaned;
}

export async function getExistingModuleReview(moduleId: string): Promise<ReviewData | null> {
  return reviewStatsStore.get(moduleId) || null;
}

export async function generateModuleReview(
  moduleId: string,
  sessionStats?: ReviewSessionInput
): Promise<ReviewData> {
  const conceptsCount = sessionStats?.conceptsCount ?? 0;
  const notesCount = sessionStats?.notesCount ?? 0;
  const chatTurns = sessionStats?.chatTurnsCount ?? 0;
  const misinfoCount = sessionStats?.devilsAdvocateCount ?? 0;
  const synthLen =
    sessionStats?.synthesisLength ??
    (sessionStats?.synthesisText ? sessionStats.synthesisText.length : 0);

  let criticalThinkingScore = Math.min(100, Math.max(50, 50 + notesCount * 8 + chatTurns * 4));
  let synthesisScore = Math.min(
    100,
    Math.max(50, 55 + Math.floor(synthLen / 12) + conceptsCount * 5)
  );

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

  // Optional AI-powered evaluation when student artefacts and GROQ_API_KEY are available in live runtime
  const groqKey = getSanitizedGroqKey();
  const hasArtefacts =
    (sessionStats?.notes && sessionStats.notes.length > 0) ||
    (sessionStats?.conceptNodes && sessionStats.conceptNodes.length > 0) ||
    (sessionStats?.chatMessages && sessionStats.chatMessages.length > 0) ||
    Boolean(sessionStats?.synthesisText && sessionStats.synthesisText.trim());

  if (groqKey && hasArtefacts && process.env.NODE_ENV !== 'test') {
    try {
      const groq = new Groq({
        apiKey: groqKey,
        httpAgent: insecureHttpsAgent,
      });

      const notesSnippet = (sessionStats?.notes || [])
        .slice(0, 6)
        .map((n) => `"${n.highlightedText.slice(0, 60)}" -> ${n.noteText.slice(0, 80)}`)
        .join('; ');
      const nodesSnippet = (sessionStats?.conceptNodes || [])
        .slice(0, 8)
        .map((n) => n.text)
        .join(', ');
      const chatSnippet = (sessionStats?.chatMessages || [])
        .filter((m) => m.sender === 'student')
        .slice(-5)
        .map((m) => m.text.slice(0, 100))
        .join(' | ');
      const synthSnippet = (sessionStats?.synthesisText || '').slice(0, 400);
      const toneLabel = sessionStats?.agentPersonality || 'Friendly';

      const prompt = `You are ${sessionStats?.avatarName || 'Aria'}, an educational critical thinking AI companion speaking in the user's selected tone: ${toneLabel}.
Evaluate the student's critical thinking activity across the module:
- Evidence Notes (${notesCount}): ${notesSnippet || 'None'}
- Concept Map Nodes (${conceptsCount}): ${nodesSnippet || 'None'}
- Student Inquiry Turns (${chatTurns}): ${chatSnippet || 'None'}
- Final Synthesis Conclusion: ${synthSnippet || 'None'}

Return ONLY a valid JSON object with these exact keys:
{
  "criticalThinkingScore": <integer 55 to 98>,
  "synthesisScore": <integer 55 to 98>,
  "mbtiPersonalityTitle": "<creative MBTI-style critical thinker title e.g. Curious Critical Thinker (C-C-T-I)>",
  "mbtiPersonalitySummary": "<2-3 sentences in your selected tone (${toneLabel}) summarizing how the student reasoned, questioned assumptions, and synthesized evidence>"
}`;

      const completion = await Promise.race([
        groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'openai/gpt-oss-120b',
          temperature: 0.5,
          max_tokens: 240,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Review AI timeout')), 2400)
        ),
      ]);

      const rawText = completion.choices[0]?.message?.content?.trim() || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.criticalThinkingScore === 'number') {
          criticalThinkingScore = Math.min(100, Math.max(50, Math.round(parsed.criticalThinkingScore)));
        }
        if (typeof parsed.synthesisScore === 'number') {
          synthesisScore = Math.min(100, Math.max(50, Math.round(parsed.synthesisScore)));
        }
        if (typeof parsed.mbtiPersonalityTitle === 'string' && parsed.mbtiPersonalityTitle.trim()) {
          mbtiPersonalityTitle = parsed.mbtiPersonalityTitle.trim();
        }
        if (
          typeof parsed.mbtiPersonalitySummary === 'string' &&
          parsed.mbtiPersonalitySummary.trim().length > 20
        ) {
          mbtiPersonalitySummary = parsed.mbtiPersonalitySummary.trim();
        }
      }
    } catch (err) {
      // Fallback to deterministic scores and MBTI summary
    }
  }

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
  saveStoreToDisk();
  return reviewResult;
}

