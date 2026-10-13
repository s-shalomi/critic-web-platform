/**
 * Socratic AI Agent Service
 * Dedicated Groq-only implementation (openai/gpt-oss-120b) per user specification.
 * Enforces all 7 Socratic Core Behaviour guardrails, Devil's Advocate & Scaffolding modes,
 * cross-stage tone adherence, 15-turn context window compression, and dynamic avatar hints.
 */

import Groq from 'groq-sdk';
import https from 'https';

export type AgentMode = 'Socratic' | 'DevilsAdvocate' | 'Scaffolding';

export interface ChatTurn {
  sender: 'student' | 'agent';
  text: string;
  messageType?: 'chat' | 'devils_advocate' | 'hint' | 'nudge' | 'scaffolding';
}

export interface ModuleSnapshot {
  topicTitle: string;
  currentStage: string;
  notes: Array<{ highlightedText: string; noteText: string }>;
  conceptNodes: Array<{ text: string }>;
  conceptLinks?: Array<{ fromText: string; toText: string }>;
  sources?: Array<{ title: string; authorName?: string; excerpt: string }>;
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
 * Builds an explicit vocal and phrasing directive for the user's selected tone
 * so the agent consistently responds in the selected tone across all stages.
 */
export function buildToneDirective(agentPersonality?: string): string {
  const raw = (agentPersonality || 'Friendly').trim();
  const lower = raw.toLowerCase();

  if (lower.includes('witty challenger') || lower.includes('witty')) {
    return `SELECTED TONE — WITTY CHALLENGER (${raw}): Use a playful, sharp, and strategic voice. Incorporate clever wit, light-hearted roasts, and sharp provocations to challenge the student's thinking while keeping it fun.`;
  }
  if (lower.includes('mentor')) {
    return `SELECTED TONE — MENTOR (${raw}): Use a relatable, calm, patient, and non-judgmental voice. Guide the student with thoughtful, reflective questions that foster self-discovery.`;
  }
  if (lower.includes('curious explorer') || lower.includes('curious')) {
    return `SELECTED TONE — CURIOUS EXPLORER (${raw}): Use a gentle, inquisitive, and enthusiastic voice. Show genuine fascination with the student's ideas and warmly encourage them to dig deeper.`;
  }
  if (lower.includes("devil's advocate") || lower.includes('devils advocate')) {
    return `SELECTED TONE — DEVIL'S ADVOCATE (${raw}): Use a rigorous, skeptical, assumption-testing voice that pushes the student to consider counter-perspectives and alternative interpretations.`;
  }
  if (lower.includes('friendly')) {
    return `SELECTED TONE — FRIENDLY (${raw}): Use an encouraging, warm, and engaging voice without sounding corporate. Use natural Gen Z phrasing, light humor, and supportive language.`;
  }
  return `SELECTED TONE — ${raw}: Strictly adopt the phrasing, voice, and questioning style of "${raw}" in every sentence.`;
}

/**
 * Applies tone-specific opening flair to deterministic fallback questions
 * so offline/fallback turns also honor the student's selected tone in all stages.
 */
export function applyToneToFallback(question: string, agentPersonality?: string): string {
  const lower = (agentPersonality || '').toLowerCase();
  if (lower.includes('witty')) {
    return `Plot twist—let's stress-test that! ${question}`;
  }
  if (lower.includes('mentor')) {
    return `Take a calm step back and reflect on this: ${question}`;
  }
  if (lower.includes('curious')) {
    return `Ooh, I'm really curious about where your thinking leads here—${question.charAt(0).toLowerCase()}${question.slice(1)}`;
  }
  if (lower.includes("devil's advocate") || lower.includes('devils advocate')) {
    return `Let's push back on that assumption for a second: ${question}`;
  }
  if (lower.includes('friendly')) {
    return `Love how you're diving into this! Quick question for you: ${question}`;
  }
  return question;
}

/**
 * Constructs system prompt enforcing all 7 Socratic guardrails, persona tone,
 * agent mode (Socratic, DevilsAdvocate, Scaffolding), and full module snapshot.
 */
export function buildSocraticSystemPrompt(
  snapshot: ModuleSnapshot,
  mode: AgentMode = 'Socratic'
): string {
  const avatarName = snapshot.avatarName || 'Aria';
  const tone = snapshot.agentPersonality || 'Friendly';
  const toneDirective = buildToneDirective(tone);

  const notesText = snapshot.notes
    .map((n) => `-[Highlight: "${n.highlightedText}"] Note: "${n.noteText}"`)
    .join('\n');
  const nodesText = snapshot.conceptNodes.map((n) => `-[Concept Node: "${n.text}"]`).join('\n');
  const linksText = (snapshot.conceptLinks || [])
    .map((l) => `-[Concept Link: "${l.fromText}" <-> "${l.toText}"]`)
    .join('\n');
  const sourcesText = (snapshot.sources || [])
    .map(
      (s) =>
        `-[Source: "${s.title}"${s.authorName ? ` by ${s.authorName}` : ''}]: "${s.excerpt}"`
    )
    .join('\n');

  let modeInstruction = 'SOCRATIC INQUIRY MODE: Prompt the student to question assumptions, seek alternative viewpoints, and assess evidence credibility.';
  if (mode === 'DevilsAdvocate') {
    modeInstruction = `DEVIL'S ADVOCATE MODE: Simulate an opposing argument or a common misinformation claim related to "${snapshot.topicTitle}", clearly scoped to the provided source material below. Ask the student to evaluate its credibility. NEVER present the opposing claim in a way that could be mistaken as your own personal belief (frame it as "Some critics argue..." or "Consider a perspective claiming...").`;
  } else if (mode === 'Scaffolding') {
    modeInstruction = `SCAFFOLDING MODE: Break down the analytical step for the student by pointing them to specific provided sources or prior notes/nodes and asking a foundational open-ended question to help them build their argument without doing the thinking for them.`;
  }

  return `
You are ${avatarName}, an AI peer acting as a ${tone} on the topic of "${snapshot.topicTitle}".
${toneDirective}

CRITICAL SOCRATIC GUARDRAILS (MUST OBEY STRICTLY IN ALL STAGES):
1. NEVER deliver a direct factual claim, opinion, or verdict on the topic content.
2. EVERY substantive turn MUST end with a probing Socratic question, a prompt to reconsider, or a counter-perspective. However, you may briefly respond to or encourage the user in the first section of your response.
3. Reference the student's own prior inputs (notes, concept nodes, links, chat history) within the same module wherever relevant.
4. NEVER fabricate sources or citations. If asked for factual evidence, direct the student back to the provided topic sources or ask the student how they could find supporting/contradicting evidence themselves.
5. NEVER use definitive phrases like "That is correct", "You are right", "You are wrong", or "That is false".
6. NEVER ask leading questions. Critical thinking must NOT be done for the user.
7. Strictly use the user's selected tone (${tone}) in your phrasing and questioning style.
8. Always complete your thoughts and sentences fully. Never stop mid-sentence.

CURRENT INVESTIGATION CONTEXT:
Topic: ${snapshot.topicTitle}
Current Stage: ${snapshot.currentStage}

${sourcesText ? `PROVIDED MODULE SOURCES:\n${sourcesText}\n` : ''}
STUDENT EVIDENCE NOTES:
${notesText || '(No notes taken yet)'}

STUDENT CONCEPT MAP NODES:
${nodesText || '(No concept nodes created yet)'}

${linksText ? `STUDENT CONCEPT MAP LINKS:\n${linksText}\n` : ''}
${snapshot.synthesisDraft ? `STUDENT DRAFT SYNTHESIS:\n${snapshot.synthesisDraft}\n` : ''}
CURRENT MODE: ${modeInstruction}
  `.trim();
}

/**
 * Compress history: keeps the last 15 turns of dialogue in raw text.
 * Older conversation turns are summarized into a short content-aware string.
 */
export function compressChatHistory(history: ChatTurn[]): string {
  const MAX_RAW_TURNS = 15;
  if (history.length <= MAX_RAW_TURNS) {
    return history.map((h) => `${h.sender.toUpperCase()}: ${h.text}`).join('\n');
  }

  const olderTurns = history.slice(0, history.length - MAX_RAW_TURNS);
  const recentTurns = history.slice(history.length - MAX_RAW_TURNS);

  const keySnippets = olderTurns
    .slice(-4)
    .map((t) => `${t.sender}: "${t.text.slice(0, 60).replace(/\s+/g, ' ').trim()}"`)
    .join('; ');

  const olderSummary = `[Summary of earlier dialogue (${olderTurns.length} turns): ${keySnippets}]`;
  const recentText = recentTurns.map((h) => `${h.sender.toUpperCase()}: ${h.text}`).join('\n');

  return `${olderSummary}\n${recentText}`;
}

/**
 * Primary LLM caller using Groq only (openai/gpt-oss-120b)
 */
export async function generateSocraticResponse(
  history: ChatTurn[],
  snapshot: ModuleSnapshot,
  mode: AgentMode = 'Socratic'
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

  // Instant Socratic fallback rule with tone awareness
  const fallbackSocraticReplies = [
    'What specific evidence from the provided sources supports that perspective, and how might someone with an opposing view challenge it?',
    'How do the observations in your notes compare with the broader claims made across the module sources?',
    'What underlying assumptions are embedded in that claim, and what additional evidence from the sources would you need to test it?',
    'If you compare the different sources in this module, what tensions or missing links stand out in your reasoning?',
  ];
  const randomReply = fallbackSocraticReplies[Math.floor(Math.random() * fallbackSocraticReplies.length)];
  return {
    text: applyToneToFallback(randomReply, snapshot.agentPersonality),
    provider: 'fallback_rule',
  };
}

/**
 * Dynamic Avatar Socratic Hint Generator for Familiarise and Conceptualise stages.
 * Enforces all 7 Socratic guardrails and the user's selected tone.
 */
export async function generateAvatarHint(params: {
  stage: string;
  topicTitle?: string;
  sourceTitle?: string;
  sourceText?: string;
  notes?: Array<{ highlightedText: string; noteText: string }>;
  conceptNodes?: Array<{ text: string }>;
  conceptLinks?: Array<{ fromNodeId?: string; toNodeId?: string; fromText?: string; toText?: string }>;
  agentPersonality?: string;
  avatarName?: string;
}): Promise<{ text: string; provider: 'groq' | 'fallback_rule' | 'rate_limit_error'; isError?: boolean }> {
  const groqApiKey = getSanitizedKey('GROQ_API_KEY');

  const avatarName = params.avatarName || 'Aria';
  const tone = params.agentPersonality || 'Friendly';
  const toneDirective = buildToneDirective(tone);
  const stage = params.stage || 'familiarise';
  const topicTitle = params.topicTitle || 'Climate Change';

  const notesList = (params.notes || [])
    .map((n) => `[Highlight: "${n.highlightedText}"] Note: "${n.noteText}"`)
    .join('; ');
  const nodesList = (params.conceptNodes || []).map((n) => `"${n.text}"`).join(', ');
  const namedLinks = (params.conceptLinks || [])
    .filter((l) => l.fromText && l.toText)
    .map((l) => `"${l.fromText}" <-> "${l.toText}"`)
    .join(', ');
  const linksCount = (params.conceptLinks || []).length;

  const systemPrompt = `
You are ${avatarName}, an AI peer acting as a ${tone} on the topic of "${topicTitle}".
${toneDirective}

CRITICAL SOCRATIC GUARDRAILS (MUST OBEY STRICTLY):
1. NEVER state a direct factual claim, opinion, or verdict on the topic content.
2. End your response with ONE concise, open-ended Socratic question (you may include a brief encouraging remark in the first sentence).
3. Reference both the source currently in view AND the student's existing notes/concept nodes where present.
4. NEVER fabricate sources or citations.
5. NEVER use definitive phrases like "That is correct", "You are right", "You are wrong", or "That is false".
6. NEVER ask leading questions; do not do the critical thinking for the user.
7. Strictly use the user's selected tone (${tone}).
  `.trim();

  let prompt = '';
  if (stage === 'conceptualise') {
    prompt = `
The student is on the "conceptualise" (Mind Map) stage and clicked your avatar for a Socratic hint.

SOURCE CURRENTLY IN VIEW:
Title: ${params.sourceTitle || 'Module Evidence Source'}
Excerpt: "${params.sourceText ? params.sourceText.slice(0, 300) : 'Source evidence on screen'}"

STUDENT'S EXISTING CONCEPT NODES:
${nodesList || '(No concept nodes created yet on the canvas)'}

STUDENT'S CONCEPT CONNECTIONS / LINKS:
${namedLinks || (linksCount > 0 ? `${linksCount} links connected between nodes` : 'No connections linked between nodes yet')}

STUDENT'S EVIDENCE NOTES:
${notesList || '(No notes taken yet)'}

Task: Ask ONE concise Socratic question (1-2 sentences) in your ${tone} voice that relates the source currently in view and the student's existing concept nodes/notes without asking a leading question.
    `.trim();
  } else {
    prompt = `
The student is on the "${stage}" (Read + Annotate) stage and clicked your avatar for a Socratic hint.

SOURCE CURRENTLY IN VIEW:
Title: ${params.sourceTitle || 'Module Evidence Source'}
Excerpt: "${params.sourceText ? params.sourceText.slice(0, 300) : 'Source evidence on screen'}"

STUDENT'S EXISTING NOTES:
${notesList || '(No notes taken yet)'}

STUDENT'S EXISTING CONCEPT NODES:
${nodesList || '(No concept nodes created yet)'}

Task: Ask ONE concise Socratic question (1-2 sentences) in your ${tone} voice related to the source currently in view and the student's existing notes/nodes without asking a leading question.
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
          { role: 'system', content: systemPrompt },
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
      text: '⚠️ The AI hint service is temporarily rate limited. Please try clicking again in a few moments.',
      provider: 'rate_limit_error',
      isError: true,
    };
  }

  // Instant stage-aware and tone-aware fallback rule (0ms latency)
  const nodeA = params.conceptNodes?.[0]?.text;
  const nodeB = params.conceptNodes?.[1]?.text;
  const noteA = params.notes?.[0]?.noteText;

  const conceptualiseFallbackHints = nodeA && nodeB
    ? [
        `How do you see "${nodeA}" and "${nodeB}" relating to the source "${params.sourceTitle || 'on screen'}"?`,
        `What underlying evidence or assumption connects "${nodeA}" and "${nodeB}"?`,
        `Is there an alternative interpretation or missing link between "${nodeA}" and "${nodeB}"?`,
      ]
    : nodeA
    ? [
        `What concept from "${params.sourceTitle || 'this source'}" could you link to "${nodeA}"?`,
        `What assumptions are embedded inside your concept node "${nodeA}"?`,
        `How does "${nodeA}" relate back to the evidence you highlighted?`,
      ]
    : [
        'What key concept from the source currently on screen could you turn into your first concept node?',
        'How might you represent the relationships in these sources as concept nodes?',
        'Which claim from your notes would make the strongest starting concept node?',
      ];

  const familiariseFallbackHints = noteA
    ? [
        `How does the claim in "${params.sourceTitle || 'this source'}" compare with your note "${noteA}"?`,
        `Building on your note "${noteA}", what underlying assumption might the author of this source be making?`,
      ]
    : [
        'What underlying assumptions might the author be making in this source?',
        'What evidence in this source could challenge or support your initial thoughts?',
        'What additional information would you need before evaluating the credibility of this source?',
      ];

  const list = stage === 'conceptualise' ? conceptualiseFallbackHints : familiariseFallbackHints;
  const hint = list[Math.floor(Math.random() * list.length)];
  return { text: applyToneToFallback(hint, tone), provider: 'fallback_rule' };
}
