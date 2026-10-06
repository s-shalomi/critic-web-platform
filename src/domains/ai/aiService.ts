/**
 * Socratic AI Agent Service
 * Handles Google Gen AI (@google/genai SDK with gemini-3.7-flash) with automatic, seamless fallback to Groq (openai/gpt-oss-120b).
 * Enforces Socratic questioning, Devil's Advocate mode, non-definitive guardrails, context window compression,
 * and dynamic avatar hint generation for Familiarise and Conceptualise stages per requirements.md.
 */

import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

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
 * Primary and fallback model definitions
 * Strictly Gemini 3.7 and 3.8 with Groq openai/gpt-oss-120b as fallback
 */
const GEMINI_PRIMARY_MODEL = 'gemini-3.7-flash';
const GEMINI_FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.8-flash'];

const GROQ_PRIMARY_MODEL = 'openai/gpt-oss-120b';
const GROQ_FALLBACK_MODELS = ['openai/gpt-oss-120b'];

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
 * Primary LLM caller using @google/genai SDK with automatic Groq fallback execution
 */
export async function generateSocraticResponse(
  history: ChatTurn[],
  snapshot: ModuleSnapshot,
  mode: 'Socratic' | 'DevilsAdvocate' = 'Socratic'
): Promise<{ text: string; provider: 'gemini' | 'groq' | 'fallback_rule' | 'rate_limit_error'; isError?: boolean }> {
  const geminiApiKey = getSanitizedKey('GEMINI_API_KEY');
  const groqApiKey = getSanitizedKey('GROQ_API_KEY');

  const systemPrompt = buildSocraticSystemPrompt(snapshot, mode);
  const formattedHistory = compressChatHistory(history);
  const fullPrompt = `${systemPrompt}\n\nCHAT HISTORY:\n${formattedHistory}\n\nAGENT:`;

  let hadRateLimit = false;

  // 1. Try Google Gen AI (@google/genai SDK) with gemini-3.7-flash and gemini-3.8-flash (3s timeout)
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      for (const modelName of GEMINI_FALLBACK_MODELS) {
        try {
          const apiPromise = ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: {
              maxOutputTokens: 2048,
              temperature: 0.7,
            },
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Gemini (${modelName}) timed out after 3s`)), 3000)
          );

          const response = (await Promise.race([apiPromise, timeoutPromise])) as any;
          const responseText = response?.text;
          if (responseText && responseText.trim()) {
            return { text: responseText.trim(), provider: 'gemini' };
          }
        } catch (mErr: any) {
          if (isRateLimitError(mErr)) hadRateLimit = true;
          console.warn(`[AI Service] @google/genai (${modelName}) failed or timed out (3s). Trying next/fallback...`, mErr?.message || mErr);
        }
      }
    } catch (err: any) {
      if (isRateLimitError(err)) hadRateLimit = true;
      console.warn('[AI Service] @google/genai client failed. Falling back to Groq...', err?.message || err);
    }
  }

  // 2. Fallback to Groq API (openai/gpt-oss-120b only, 3s timeout)
  if (groqApiKey) {
    const groqClient = new Groq({ apiKey: groqApiKey });
    for (const modelName of GROQ_FALLBACK_MODELS) {
      try {
        const groqPromise = groqClient.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: formattedHistory },
          ],
          model: modelName,
          max_tokens: 2048,
          temperature: 0.7,
        });

        const groqTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Groq (${modelName}) timed out after 3s`)), 3000)
        );

        const completion = (await Promise.race([groqPromise, groqTimeoutPromise])) as any;
        const groqText = completion.choices[0]?.message?.content;
        if (groqText && groqText.trim()) {
          return { text: groqText.trim(), provider: 'groq' };
        }
      } catch (err: any) {
        if (isRateLimitError(err)) hadRateLimit = true;
        console.warn(`[AI Service] Groq (${modelName}) failed or timed out (3s):`, err?.message || err);
      }
    }
  }

  // If rate limits were encountered on configured providers and both failed, return explicit rate limit error
  if (hadRateLimit) {
    return {
      text: '⚠️ The AI service is currently rate limited due to high demand. Please wait a few moments and try your response again.',
      provider: 'rate_limit_error',
      isError: true,
    };
  }

  // 3. Fallback Socratic Rule Engine if providers are unconfigured or fail
  const fallbackSocraticReplies = [
    'What specific evidence from the sources supports that perspective? How might someone with an opposing view challenge it?',
    'If we look at long-term regional climate trends versus short-term weather anomalies, how does that affect your conclusion?',
    'What assumptions are embedded in that claim, and what additional data would you need to verify it?',
    'How do the scientific observations in your notes compare with public social claims on this issue?',
  ];

  const randomReply =
    fallbackSocraticReplies[Math.floor(Math.random() * fallbackSocraticReplies.length)];
  return { text: randomReply, provider: 'fallback_rule' };
}

/**
 * Dynamic Avatar Socratic Hint Generator for Familiarise and Conceptualise stages per requirements.md:
 * "When student clicks on avatar, the agent asks one Socratic Question related to the source currently in view and the student's existing notes/nodes"
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
}): Promise<{ text: string; provider: 'gemini' | 'groq' | 'fallback_rule' | 'rate_limit_error'; isError?: boolean }> {
  const geminiApiKey = getSanitizedKey('GEMINI_API_KEY');
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
    // Conceptualise stage: LLM hint is specifically driven by concept nodes and links
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

REQUIREMENTS (CONCEPT-NODE BASED GUIDANCE):
1. Focus your Socratic Question specifically on the student's concept nodes:
   - If multiple concept nodes exist: Ask a probing question about the relationship, causation, or underlying assumptions between specific nodes (e.g. comparing "${params.conceptNodes?.[0]?.text || 'Node A'}" with "${params.conceptNodes?.[1]?.text || 'Node B'}").
   - If only 1 concept node exists: Ask what counter-claim or supporting concept from their notes should be added to connect to "${params.conceptNodes?.[0]?.text}".
   - If 0 concept nodes exist: Ask a question prompting them to convert a key claim from their evidence notes into their first concept node.
2. DO NOT deliver any direct factual claims, answers, or verdicts.
3. Keep the response to 1-2 concise, complete sentences ending in a question. Ensure sentences are fully finished.
    `.trim();
  } else {
    // Familiarise stage: driven by source in view and evidence notes
    prompt = `
You are ${avatarName}, an AI peer acting as a ${tone} on the topic of "${topicTitle}".
The student is currently on the "${stage}" stage and just clicked on your avatar for guidance.

CONTEXT:
Source currently in view: ${params.sourceTitle || 'Climate Evidence Source'}
Source content excerpt: "${params.sourceText ? params.sourceText.slice(0, 350) : 'General evidence on climate patterns'}"
Student's existing notes: ${notesList || 'None yet'}
Student's concept nodes: ${nodesList || 'None yet'}

REQUIREMENTS:
1. Provide exactly ONE concise, probing Socratic Question related to the source currently on screen and the student's reasoning.
2. DO NOT deliver any direct factual statements, conclusions, or answers.
3. Keep the response to 1-2 complete sentences ending in a question. Ensure sentences are fully finished.
    `.trim();
  }

  let hadRateLimit = false;

  // 1. Try Google Gen AI (@google/genai SDK) with gemini-3.7-flash and gemini-3.8-flash (3s timeout)
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      for (const modelName of GEMINI_FALLBACK_MODELS) {
        try {
          const apiPromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { maxOutputTokens: 1024, temperature: 0.7 },
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Gemini hint (${modelName}) timed out after 3s`)), 3000)
          );

          const res = (await Promise.race([apiPromise, timeoutPromise])) as any;
          const text = res?.text;
          if (text && text.trim()) return { text: text.trim(), provider: 'gemini' };
        } catch (e: any) {
          if (isRateLimitError(e)) hadRateLimit = true;
          console.warn(`[AI Service Hint] @google/genai (${modelName}) failed or timed out (3s). Falling back...`, e?.message || e);
        }
      }
    } catch (err: any) {
      if (isRateLimitError(err)) hadRateLimit = true;
      console.warn('[AI Service Hint] @google/genai client error:', err?.message || err);
    }
  }

  // 2. Try Groq (openai/gpt-oss-120b only, 3s timeout)
  if (groqApiKey) {
    const groqClient = new Groq({ apiKey: groqApiKey });
    for (const modelName of GROQ_FALLBACK_MODELS) {
      try {
        const groqPromise = groqClient.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: modelName,
          max_tokens: 1024,
          temperature: 0.7,
        });

        const groqTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Groq hint (${modelName}) timed out after 3s`)), 3000)
        );

        const completion = (await Promise.race([groqPromise, groqTimeoutPromise])) as any;
        const text = completion.choices[0]?.message?.content;
        if (text && text.trim()) return { text: text.trim(), provider: 'groq' };
      } catch (e: any) {
        if (isRateLimitError(e)) hadRateLimit = true;
        console.warn(`[AI Service Hint] Groq (${modelName}) failed or timed out (3s):`, e?.message || e);
      }
    }
  }

  if (hadRateLimit) {
    return {
      text: '⚠️ The AI hint service is temporarily rate limited. Please try clicking Aria again in a few moments.',
      provider: 'rate_limit_error',
      isError: true,
    };
  }

  // 3. Fallback hints
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

