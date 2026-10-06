# AI Agent Domain Documentation

## Overview
The AI Agent domain encapsulates the Socratic AI Engine, Google Gen AI (`@google/genai`) + Groq API clients with automatic fallback execution, persona tone management, and strict non-definitive guardrails.

## Provider Resilience Architecture
1. **Primary LLM**: Google Gen AI SDK (`@google/genai`) using strictly `gemini-3.7-flash` and `gemini-3.8-flash` with 9s timeout race and 2048 token headroom.
2. **Fallback LLM**: Groq Cloud SDK using strictly `openai/gpt-oss-120b` (2048 tokens).
3. **Rate Limit & Error Handling**: Explicitly captures rate limits (429 / quota limits) and surfaces user-friendly error messages and retry guidance.
4. **Fallback Rule Engine**: Guarantees a valid, high-quality Socratic response if both external providers fail or are unconfigured, keeping UI unblocked without 500 errors.

## Features
- **Socratic Inquiry Chat**: Evaluates arguments and challenges assumptions across stages.
- **Dynamic Avatar Hints**: Generates context-aware Socratic hints based on currently viewed sources, notes, and visual concept map nodes.
- **Devil's Advocate Mode**: Simulates counter-arguments and tests student reasoning without asserting factual claims.

## Socratic Guardrails
- **No Direct Factual Claims or Verdicts**: Never tells the student "you are right/wrong".
- **Socratic Turn Ending**: Every substantive turn ends with a probing question or counter-perspective.
- **Context Compression**: Raw text of last 10 turns + summarized older turns + full snapshot of module state (notes, nodes, draft synthesis).

## Key Files
- [`aiService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/ai/aiService.ts): Prompt construction, Google Gen AI / Groq client execution, and fallback mechanism.
