/**
 * Socratic AI Agent Service
 * Dedicated Groq-only implementation (openai/gpt-oss-120b) per user specification.
 * Enforces Socratic questioning, Devil's Advocate mode, non-definitive guardrails,
 * context window compression, and dynamic avatar hint generation for Familiarise and Conceptualise stages.
 */

import Groq from 'groq-sdk';
import https from 'https';

export interface ChatTurn {
  sender: 'student' | 'agent';
  text: string;
  messageType?: 'chat' | 'devils_advocate' | 'hint' | 'nudge';
}

export interface ModuleSnapshot {
  topicTitle: string;
  currentStage: string;
  notes: Array<{ highlightedText: string; noteText: string }>;
  conceptNodes: Array<{ text: string }>;
  synthesisDraft?: string;
  agentPersonality?: string;
  avatarName?: string;
}

/**
 * Sanitizes API keys by stripping quotes and whitespace
 */
function getSanitizedKey(keyName: string): string {
  const val = process.env[keyName] || '';
  return val.trim().replace(/^["']|["']$/g, '');
}

/**
 * Primary model definition
 * Strictly Groq openai/gpt-oss-120b
 */
const GROQ_PRIMARY_MODEL = 'openai/gpt-oss-120b';

/**
 * Global timeout for Groq API response (in milliseconds)
 */
const GROQ_TIMEOUT_MS = 2800;

/**
 * Dedicated custom HTTPS agent to prevent institutional TLS proxy certificate rejections
 */
const sslAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Checks if an error is a rate limit / quota exceeded error
 */
function isRateLimitError(err: any): boolean {
  if (!err) return false;
  if (err.status === 429 || err.statusCode === 429) return true;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('too many requests')
  );
}

/**
 * Constructs system prompt enforcing Socratic guardrails and persona tone
 */
export function buildSocraticSystemPrompt(
  snapshot: ModuleSnapshot,
  mode: 'Socratic' | 'DevilsAdvocate' = 'Socratic'
): string {
  const avatarName = snapshot.avatarName || 'Aria';
  const tone = snapshot.agentPersonality || 'Socratic Peer';

  const notesText = snapshot.notes
    .map((n) => `-[Highlight: "${n.highlightedText}"] Note: "${n.noteText}"`)
    .join('\n');
  const nodesText = snapshot.conceptNodes.map((n) => `-[Concept Node: "${n.text}"]`).join('\n');

  return `
You are ${avatarName}, an AI peer acting as a ${tone} on the topic of "${snapshot.topicTitle}".

CRITICAL SOCRATIC GUARDRAILS (MUST OBEY strictly):
1. NEVER deliver a direct factual claim, verdict, or definitive opinion.
2. NEVER say "That is correct", "You are right", "You are wrong", or "That is false".
3. EVERY substantive turn MUST end with a probing Socratic question, a counter-perspective, or a prompt to evaluate evidence credibility.
4. Reference the student's prior notes and concept map nodes where relevant.
5. If asked for factual evidence, direct the student back to the provided topic sources or ask how they could verify the claim.
6. Always complete your thoughts and sentences fully. Never stop mid-sentence.

CURRENT INVESTIGATION CONTEXT:
Topic: ${snapshot.topicTitle}
Current Stage: ${snapshot.currentStage}

STUDENT EVIDENCE NOTES:
${notesText || '(No notes taken yet)'}

STUDENT CONCEPT MAP NODES:
${nodesText || '(No concept nodes created yet)'}

${snapshot.synthesisDraft ? `STUDENT DRAFT SYNTHESIS:\n${snapshot.synthesisDraft}` : ''}

CURRENT MODE: ${
    mode === 'DevilsAdvocate'
      ? "DEVIL'S ADVOCATE MODE (Simulate a common opposing argument or popular climate skepticism claim, clearly asking the student to critique its validity without claiming it is your true belief)."
      : 'SOCRATIC INQUIRY MODE'
  }
  `.trim();
}

/**
 * Compress history: keeps last 10 turns as raw text, summarizes older turns
 */
export function compressChatHistory(history: ChatTurn[]): string {
  if (history.length <= 10) {
    return history.map((h) => `${h.sender.toUpperCase()}: ${h.text}`).join('\n');
  }

  const olderTurns = history.slice(0, history.length - 10);
  const recentTurns = history.slice(history.length - 10);

  const olderSummary = `[Summary of earlier dialogue: Student and agent discussed ${olderTurns.length} turns regarding evidence assumptions.]`;
  const recentText = recentTurns.map((h) => `${h.sender.toUpperCase()}: ${h.text}`).join('\n');

  return `${olderSummary}\n${recentText}`;
}

/**
 * Primary LLM caller using Groq only (openai/gpt-oss-120b)
 */
export async function generateSocraticResponse(
  history: ChatTurn[],
  snapshot: ModuleSnapshot,
  mode: 'Socratic' | 'DevilsAdvocate' = 'Socratic'
): Promise<{ text: string; provider: 'groq' | 'fallback_rule' | 'rate_limit_error'; isError?: boolean }> {
  const groqApiKey = getSanitizedKey('GROQ_API_KEY');
  const systemPrompt = buildSocraticSystemPrompt(snapshot, mode);
  const formattedHistory = compressChatHistory(history);

  let hadRateLimit = false;

  if (groqApiKey) {
    try {
      const groqClient = new Groq({
        apiKey: groqApiKey,
        httpAgent: sslAgent,
      });

      const groqPromise = groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: formattedHistory },
        ],
        model: GROQ_PRIMARY_MODEL,
        max_tokens: 220,
        temperature: 0.7,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Groq request timed out')), GROQ_TIMEOUT_MS)
      );

      const completion = (await Promise.race([groqPromise, timeoutPromise])) as any;
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) {
        return { text, provider: 'groq' };
      }
    } catch (err: any) {
      if (isRateLimitError(err)) hadRateLimit = true;
      console.warn('[AI Service] Groq call failed or timed out:', err?.message || err);
    }
  }

  if (hadRateLimit) {
    return {
      text: '⚠️ The AI service is currently rate limited due to high demand. Please wait a few moments and try your response again.',
      provider: 'rate_limit_error',
      isError: true,
    };
  }

  // Instant Socratic fallback rule
  const fallbackSocraticReplies = [
    'What specific evidence from the sources supports that perspective? How might someone with an opposing view challenge it?',
    'If we look at long-term regional climate trends versus short-term weather anomalies, how does that affect your conclusion?',
    'What assumptions are embedded in that claim, and what additional data would you need to verify it?',
    'How do the scientific observations in your notes compare with public social claims on this issue?',
  ];
  const randomReply = fallbackSocraticReplies[Math.floor(Math.random() * fallbackSocraticReplies.length)];
  return { text: randomReply, provider: 'fallback_rule' };
}

/**
 * Dynamic Avatar Socratic Hint Generator for Familiarise and Conceptualise stages.
 * Groq-only implementation (openai/gpt-oss-120b).
 */
export async function generateAvatarHint(params: {
  stage: string;
  topicTitle?: string;
  sourceTitle?: string;
  sourceText?: string;
  notes?: Array<{ highlightedText: string; noteText: string }>;
  conceptNodes?: Array<{ text: string }>;
  conceptLinks?: Array<{ fromNodeId?: string; toNodeId?: string }>;
  agentPersonality?: string;
  avatarName?: string;
}): Promise<{ text: string; provider: 'groq' | 'fallback_rule' | 'rate_limit_error'; isError?: boolean }> {
  const groqApiKey = getSanitizedKey('GROQ_API_KEY');

  const avatarName = params.avatarName || 'Aria';
  const tone = params.agentPersonality || 'Socratic Peer';
  const stage = params.stage || 'familiarise';
  const topicTitle = params.topicTitle || 'Climate Change';

  const notesList = (params.notes || []).map((n) => `"${n.noteText}"`).join(', ');
  const nodesList = (params.conceptNodes || []).map((n) => `"${n.text}"`).join(', ');
  const linksCount = (params.conceptLinks || []).length;

  let prompt = '';
  if (stage === 'conceptualise') {
    prompt = `
You are ${avatarName}, an AI peer acting as a ${tone} on the topic of "${topicTitle}".
The student is currently on the "conceptualise" stage, where they build a visual concept map of ideas and evidence.
The student just clicked on your avatar for guidance on their concept map.

STUDENT'S EXISTING CONCEPT NODES:
${nodesList || '(No concept nodes created yet on the canvas)'}

STUDENT'S CONCEPT CONNECTIONS / LINKS:
${linksCount > 0 ? `${linksCount} links connected between nodes` : 'No connections linked between nodes yet'}

STUDENT'S EVIDENCE NOTES:
${notesList || '(No notes taken yet)'}

REQUIREMENTS:
1. Provide ONE concise Socratic Question directly referencing the student's concept nodes.
2. DO NOT state direct answers or conclusions.
3. Keep to 1-2 complete sentences ending in a question.
    `.trim();
  } else {
    prompt = `
You are ${avatarName}, an AI peer acting as a ${tone} on the topic of "${topicTitle}".
The student is currently on the "${stage}" stage and just clicked on your avatar for guidance.

CONTEXT:
Source in view: ${params.sourceTitle || 'Climate Evidence Source'}
Excerpt: "${params.sourceText ? params.sourceText.slice(0, 300) : 'General evidence on climate patterns'}"
Student notes: ${notesList || 'None yet'}
Concept nodes: ${nodesList || 'None yet'}

REQUIREMENTS:
1. Provide exactly ONE concise, probing Socratic Question related to the source currently on screen.
2. DO NOT state direct conclusions or verdicts.
3. Keep to 1-2 complete sentences ending in a question.
    `.trim();
  }

  let hadRateLimit = false;

  if (groqApiKey) {
    try {
      const groqClient = new Groq({
        apiKey: groqApiKey,
        httpAgent: sslAgent,
      });

      const groqPromise = groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: `You are ${avatarName}, a Socratic peer.` },
          { role: 'user', content: prompt },
        ],
        model: GROQ_PRIMARY_MODEL,
        max_tokens: 150,
        temperature: 0.7,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Groq hint timed out')), GROQ_TIMEOUT_MS)
      );

      const completion = (await Promise.race([groqPromise, timeoutPromise])) as any;
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) {
        return { text, provider: 'groq' };
      }
    } catch (err: any) {
      if (isRateLimitError(err)) hadRateLimit = true;
      console.warn('[AI Service Hint] Groq hint call failed or timed out:', err?.message || err);
    }
  }

  if (hadRateLimit) {
    return {
      text: '⚠️ The AI hint service is temporarily rate limited. Please try clicking Aria again in a few moments.',
      provider: 'rate_limit_error',
      isError: true,
    };
  }

  // Instant stage-aware fallback rule (0ms latency)
  const nodeA = params.conceptNodes?.[0]?.text;
  const nodeB = params.conceptNodes?.[1]?.text;

  const conceptualiseFallbackHints = nodeA && nodeB
    ? [
        `How do you see "${nodeA}" influencing or causing "${nodeB}" in your reasoning?`,
        `What underlying evidence or assumption connects "${nodeA}" and "${nodeB}"?`,
        `Is there an intermediate assumption or missing link connecting "${nodeA}" and "${nodeB}"?`,
      ]
    : nodeA
    ? [
        `What counter-evidence or complementary concept could you link to "${nodeA}"?`,
        `What assumptions are embedded inside your concept node "${nodeA}"?`,
        `How does "${nodeA}" relate back to the climate evidence you gathered?`,
      ]
    : [
        'What key concept from the evidence could you turn into your first concept node?',
        'How might you represent the cause-and-effect relationships from the sources as nodes?',
        'Which claim from your notes would make the strongest starting concept node?',
      ];

  const fallbackHints: Record<string, string[]> = {
    familiarise: [
      'What underlying assumptions might the author be making in this claim?',
      'What evidence in this source could challenge or support your initial thoughts?',
      'How does this evidence distinguish between short-term weather anomalies and long-term climate trends?',
      'What additional data would you need before trusting the claim in this source?',
    ],
    conceptualise: conceptualiseFallbackHints,
  };

  const list = fallbackHints[stage] || fallbackHints.familiarise;
  const hint = list[Math.floor(Math.random() * list.length)];
  return { text: hint, provider: 'fallback_rule' };
}
