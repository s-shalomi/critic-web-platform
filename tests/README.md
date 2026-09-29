# Test Suite Documentation (`tests`)

This directory contains automated unit and integration tests written using Jest and `ts-jest` for verifying system requirements across all application domains.

---

## Test Suites

| File | Domain Tested | Requirements Verified |
| ---- | ------------- | --------------------- |
| [`auth.test.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/auth.test.ts) | Authentication | Student access code login, invalid code handling, teacher credential login, JWT signing & payload verification. |
| [`topics.test.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/topics.test.ts) | Topics & Sources | Climate Change topic availability, 'Coming Soon' topics status, initial source fetching, and dynamic teacher source creation (`addSourceToTopic`). |
| [`notes.test.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/notes.test.ts) | Notes & Evidence | Highlight note creation, edit, deletion, and auto-conversion to concept map nodes. |
| [`concepts.test.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/concepts.test.ts) | Concept Map | Clean canvas initialization, node creation/edit/delete, position persistence, and link generation. |
| [`ai.test.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/ai.test.ts) | Socratic AI Engine | Socratic prompt construction, guardrail enforcement (no factual verdicts, ends in question), chat history summarization, and Gemini/Groq fallback mechanism. |
| [`synthesis.test.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/synthesis.test.ts) | Module Synthesis | Cross-checking synthesis text against prior evidence notes & concept map nodes using Socratic prompting. |
| [`review.test.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/review.test.ts) | Case Debrief / Review | Metric calculation (6 core values), unlockable badge generation, and MBTI-like reasoning personality title/summary. |
| [`teacher.test.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/teacher.test.ts) | Teacher Portal | Unique student access code generation and teacher student progress monitoring. |

---

## Executing Tests

To run all unit and integration test suites:
```bash
npm test
```
