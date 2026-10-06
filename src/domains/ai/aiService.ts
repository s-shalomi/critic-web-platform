/**
 * Socratic AI Agent Service
 * Handles Gemini free tier API calls with automatic, seamless fallback to Groq on rate limit (429) or failure.
 * Enforces Socratic questioning, Devil's Advocate mode, non-definitive guardrails, context window compression,
 * and dynamic avatar hint generation for Familiarise and Conceptualise stages per requirements.md.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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
 * Candidate model lists for resilience against provider model deprecations/updates
 */
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'allam-2-7b'];

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
 * Primary LLM caller with automatic Gemini -> Groq fallback execution
 */
export async function generateSocraticResponse(
  history: ChatTurn[],
  snapshot: ModuleSnapshot,
  mode: 'Socratic' | 'DevilsAdvocate' = 'Socratic'
): Promise<{ text: string; provider: 'gemini' | 'groq' | 'fallback_rule'; errorDetails?: string }> {
  const geminiApiKey = getSanitizedKey('GEMINI_API_KEY');
  const groqApiKey = getSanitizedKey('GROQ_API_KEY');

  const systemPrompt = buildSocraticSystemPrompt(snapshot, mode);
  const formattedHistory = compressChatHistory(history);
  const fullPrompt = `${systemPrompt}\n\nCHAT HISTORY:\n${formattedHistory}\n\nAGENT:`;

  // 1. Try Google Gemini API first
  if (geminiApiKey) {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
          },
        });

        const apiPromise = model.generateContent(fullPrompt);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timed out after 9s')), 9000)
        );

        const result = (await Promise.race([apiPromise, timeoutPromise])) as any;
        const responseText = result?.response?.text();
        if (responseText && responseText.trim()) {
          return { text: responseText.trim(), provider: 'gemini' };
        }
      } catch (err: any) {
        console.warn(`[AI Service] Gemini (${modelName}) failed:`, err?.message || err);
      }
    }
  }

  // 2. Fallback to Groq API on Gemini failure/timeout/rate-limit
  if (groqApiKey) {
    const groqClient = new Groq({ apiKey: groqApiKey });
    for (const modelName of GROQ_MODELS) {
      try {
        const completion = await groqClient.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: formattedHistory },
          ],
          model: modelName,
          max_tokens: 300,
          temperature: 0.7,
        });

        const groqText = completion.choices[0]?.message?.content;
        if (groqText && groqText.trim()) {
          return { text: groqText.trim(), provider: 'groq' };
        }
      } catch (err: any) {
        console.warn(`[AI Service] Groq (${modelName}) failed:`, err?.message || err);
      }
    }
  }

  // 3. Fallback Socratic Rule Engine if both providers are unconfigured or fail
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
  agentPersonality?: string;
  avatarName?: string;
}): Promise<{ text: string; provider: 'gemini' | 'groq' | 'fallback_rule' }> {
  const geminiApiKey = getSanitizedKey('GEMINI_API_KEY');
  const groqApiKey = getSanitizedKey('GROQ_API_KEY');

  const avatarName = params.avatarName || 'Aria';
  const tone = params.agentPersonality || 'Socratic Peer';
  const stage = params.stage || 'familiarise';
  const topicTitle = params.topicTitle || 'Climate Change';

  const notesList = (params.notes || []).map((n) => `"${n.noteText}"`).join(', ');
  const nodesList = (params.conceptNodes || []).map((n) => `"${n.text}"`).join(', ');

  const prompt = `
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
3. Keep the response to 1-2 short sentences ending in a question.
  `.trim();

  // 1. Try Gemini
  if (geminiApiKey) {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 120, temperature: 0.7 },
        });
        const res = await model.generateContent(prompt);
        const text = res?.response?.text();
        if (text && text.trim()) return { text: text.trim(), provider: 'gemini' };
      } catch (e: any) {
        console.warn(`[AI Service Hint] Gemini (${modelName}) failed:`, e?.message || e);
      }
    }
  }

  // 2. Try Groq
  if (groqApiKey) {
    const groqClient = new Groq({ apiKey: groqApiKey });
    for (const modelName of GROQ_MODELS) {
      try {
        const completion = await groqClient.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: modelName,
          max_tokens: 120,
          temperature: 0.7,
        });
        const text = completion.choices[0]?.message?.content;
        if (text && text.trim()) return { text: text.trim(), provider: 'groq' };
      } catch (e: any) {
        console.warn(`[AI Service Hint] Groq (${modelName}) failed:`, e?.message || e);
      }
    }
  }

  // 3. Fallback hints
  const fallbackHints: Record<string, string[]> = {
    familiarise: [
      'What underlying assumptions might the author be making in this claim?',
      'What evidence in this source could challenge or support your initial thoughts?',
      'How does this evidence distinguish between short-term weather anomalies and long-term climate trends?',
      'What additional data would you need before trusting the claim in this source?',
    ],
    conceptualise: [
      'How does this concept node connect to the evidence you highlighted earlier?',
      'What cause-and-effect relationship might exist between these two connected nodes?',
      'Is there an intermediate assumption or missing link connecting your concepts?',
    ],
  };

  const list = fallbackHints[stage] || fallbackHints.familiarise;
  const hint = list[Math.floor(Math.random() * list.length)];
  return { text: hint, provider: 'fallback_rule' };
}
