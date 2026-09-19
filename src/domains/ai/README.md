# AI Agent Domain Documentation

## Overview
The AI Agent domain encapsulates the Socratic AI Engine, Gemini + Groq API client with automatic fallback execution, persona tone management, and strict non-definitive guardrails.

## Provider Resilience Architecture
1. **Primary LLM**: Google Gemini free tier (`gemini-1.5-flash`).
2. **Fallback LLM**: Groq (`llama-3.3-70b-versatile`).
3. **Fallback Rule Engine**: Guarantees a valid Socratic response if both external providers fail or rate-limit (429), keeping UI unblocked.

## Socratic Guardrails
- **No Direct Factual Claims or Verdicts**: Never tells the student "you are right/wrong".
- **Socratic Turn Ending**: Every substantive turn ends with a probing question or counter-perspective.
- **Context Compression**: Raw text of last 10 turns + summarized older turns + full snapshot of module state (notes, nodes, draft synthesis).

## Key Files
- [`aiService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/ai/aiService.ts): Prompt construction, Gemini/Groq client execution, and fallback mechanism.
