/**
 * Socratic AI Agent Service
 * Handles Gemini free tier API calls with automatic, seamless fallback to Groq on rate limit (429) or failure.
 * Enforces Socratic questioning, Devil's Advocate mode, non-definitive guardrails, and context window compression.
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

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || '';

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const groqClient = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

/**
 * Constructs system prompt enforcing Socratic guardrails and persona tone
 */
export function buildSocraticSystemPrompt(snapshot: ModuleSnapshot, mode: 'Socratic' | 'DevilsAdvocate' = 'Socratic'): string {
  const avatarName = snapshot.avatarName || 'Aria';
  const tone = snapshot.agentPersonality || 'Socratic Peer';

  const notesText = snapshot.notes.map((n) => `-[Highlight: "${n.highlightedText}"] Note: "${n.noteText}"`).join('\n');
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

CURRENT MODE: ${mode === 'DevilsAdvocate' ? "DEVIL'S ADVOCATE MODE (Simulate a common opposing argument or popular climate skepticism claim, clearly asking the student to critique its validity without claiming it is your true belief)." : 'SOCRATIC INQUIRY MODE'}
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
): Promise<{ text: string; provider: 'gemini' | 'groq' | 'fallback_rule' }> {
  const systemPrompt = buildSocraticSystemPrompt(snapshot, mode);
  const formattedHistory = compressChatHistory(history);
  const fullPrompt = `${systemPrompt}\n\nCHAT HISTORY:\n${formattedHistory}\n\nAGENT:`;

  // 1. Try Gemini API first
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();
      if (responseText && responseText.trim()) {
        return { text: responseText.trim(), provider: 'gemini' };
      }
    } catch (err) {
      console.warn('[AI Service] Gemini API call failed or rate-limited. Falling back to Groq API...', err);
    }
  }

  // 2. Fallback to Groq API on Gemini 429/failure
  if (groqClient) {
    try {
      const completion = await groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: formattedHistory },
        ],
        model: 'llama-3.3-70b-versatile',
      });
      const groqText = completion.choices[0]?.message?.content;
      if (groqText && groqText.trim()) {
        return { text: groqText.trim(), provider: 'groq' };
      }
    } catch (err) {
      console.warn('[AI Service] Groq API call failed as well.', err);
    }
  }

  // 3. Fallback Socratic Rule Engine if both providers are unconfigured or rate-limited
  const fallbackSocraticReplies = [
    'What specific evidence from the sources supports that perspective? How might someone with an opposing view challenge it?',
    'If we look at long-term regional climate trends versus short-term weather anomalies, how does that affect your conclusion?',
    'What assumptions are embedded in that claim, and what additional data would you need to verify it?',
  ];

  const randomReply = fallbackSocraticReplies[Math.floor(Math.random() * fallbackSocraticReplies.length)];
  return { text: randomReply, provider: 'fallback_rule' };
}
