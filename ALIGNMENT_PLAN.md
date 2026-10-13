# AI Agent & Platform Alignment Plan (`requirements.md`)

This document records the staged implementation plan to align the Critic web platform's AI agent behaviour and end-of-module review with [`requirements.md`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/requirements.md).

---

## Stage 1: Mandatory First-Entry AI Disclosure & Dedicated Disclosure Button (`requirements.md` Sec 4, L36–43)

### Requirements
1. At the start of every module, before any AI interaction, the student must see a short disclosure explaining that:
   - The agent will use Socratic questioning.
   - The agent may present arguments it does not itself 'believe' in order to test reasoning.
   - The student should not treat the agent's statements as verified fact.
2. This disclosure **must be accessible via a dedicated button** (separate from the top-right `?` button, which is reserved for future functionality) and **is only displayed automatically once, when a user first enters the module**.

### Implementation Details
- **Shared Disclosure State Helper ([`src/shared/utils/storage.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/shared/utils/storage.ts))**:
  - Add `hasSeenModuleDisclosure(moduleId: string): boolean` and `markModuleDisclosureSeen(moduleId: string): void` using a student-scoped `localStorage` key (`getStudentStorageKey('critic_disclosure_seen', moduleId)`).
- **Module Stage Pages ([`familiarise/page.tsx`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/app/module/%5BmoduleId%5D/familiarise/page.tsx), [`conceptualise/page.tsx`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/app/module/%5BmoduleId%5D/conceptualise/page.tsx), [`inquire/page.tsx`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/app/module/%5BmoduleId%5D/inquire/page.tsx), [`synthesise/page.tsx`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/app/module/%5BmoduleId%5D/synthesise/page.tsx))**:
  - On mount, check `!hasSeenModuleDisclosure(moduleId)`. If not yet seen for this module, automatically open the disclosure modal and call `markModuleDisclosureSeen(moduleId)` so it only displays automatically once when the user first enters the module.
  - Keep the top-right `?` button (`.helpCircleBtn`) reserved for future functionality.
  - Add a separate **`AI Disclosure`** button (`.disclosureBtn`) across all 4 stages so the student can view the disclosure at any time.
  - Standardize the 3 disclosure points across all 4 stages to match [`requirements.md` L38–40](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/requirements.md#L38-L40).

---

## Stage 2: Core Socratic Guardrails, Cross-Stage Tone Enforcement, Modes (`Socratic`, `DevilsAdvocate`, `Scaffolding`) & 15-Turn Compression (`requirements.md` Sec 4, L44–53 & L69–77)

### Requirements
- Enforce all **7 Agent Core Behaviour rules** ([`requirements.md` L46–52](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/requirements.md#L46-L52)):
  1. Never state a direct factual claim, opinion, or verdict on the topic content.
  2. Every substantive turn ends in a question, a prompt to reconsider, or a counter-perspective (may respond to or encourage a user in the first section of the response).
  3. Reference the student's own prior inputs (notes, nodes, chat history) within the same module wherever relevant.
  4. Never fabricate sources or citations; if asked for evidence, direct the student back to the provided sources or ask the student to find supporting/contradicting evidence themselves.
  5. Never use definitive phrases like `"That is correct"` or `"You are wrong"`.
  6. Never ask leading questions; critical thinking should not be done for the user.
  7. **Use the user's selected tone to respond in all stages** (`Friendly`, `Mentor`, `Witty Challenger`, `Curious Explorer`, `Devil's Advocate`).
- Include the last **15 turns** of dialogue in raw text; summarize older conversation turns into a short content-aware string.
- Support all 3 specified agent modes: `'Socratic' | 'DevilsAdvocate' | 'Scaffolding'`.

### Implementation Details
- **[`src/domains/ai/aiService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/ai/aiService.ts)**:
  - Expand `AgentMode` type to `'Socratic' | 'DevilsAdvocate' | 'Scaffolding'`.
  - Add a **Tone Voice & Phrasing Directive** builder that maps the student's selected tone into explicit vocal instructions injected into every stage call (`buildSocraticSystemPrompt`, `generateAvatarHint`, and the fallback rule engine).
  - Enforce all 7 Socratic guardrails in both `buildSocraticSystemPrompt` and `generateAvatarHint`.
  - Update `compressChatHistory` to retain the last **15** turns in raw text (`history.slice(-15)`) and summarize older turns (`history.slice(0, -15)`) by extracting key excerpts discussed earlier.

---

## Stage 3: Full Cross-Stage Context Snapshot, Tone-Consistent Openers & Dynamic Topic Resolution (`requirements.md` Sec 2 L15–17, Sec 3 L32, Sec 4 L48, L52, L55–60, L74–77)

### Requirements
- Same AI agent persists across the whole module with full context of the student's inputs (`notes`, `conceptNodes`, `conceptLinks`, `chatHistory`, `synthesisDraft`) and responds in the student's selected tone in every stage.
- **Familiarise & Conceptualise**: Clicking the avatar asks one Socratic Question related to the **source currently in view AND the student's existing notes/nodes**, phrased in the user's selected tone.
- **Synthesise**: Compare the student's draft synthesis against **notes, nodes, AND chat history** from earlier stages; identify missing links or unaddressed counterarguments and phrase these as questions in the user's selected tone.
- Never hard-code content expected to change per topic.

### Implementation Details
- **Extend `ModuleSnapshot` ([`src/domains/ai/aiService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/ai/aiService.ts))**:
  - Add `conceptLinks?: Array<{ fromText: string; toText: string }>` and `sources?: Array<{ title: string; authorName?: string; excerpt: string }>` to `ModuleSnapshot`.
  - Resolve `topicTitle` dynamically from `topicsStore` / `sourcesStore` rather than hardcoding `'Climate Change'`.
- **Stage Endpoints & Pages**:
  - Pass client-side `notes`, `conceptNodes`, and `conceptLinks` from `familiarise`, `conceptualise`, `inquire`, and `synthesise` pages to their respective AI endpoints.
  - Pass prior `chatHistory` (`critic_chat_${moduleId}`) from `synthesise/page.tsx` to `POST /api/modules/:moduleId/synthesis` so the agent cross-checks the synthesis against notes, nodes/links, AND earlier chat dialogue.

---

## Stage 4: Devil's Advocate Triggering & Source-Scoped Counterarguments (`requirements.md` Sec 4, L63–67)

### Requirements
- Triggered randomly (~30%) **and** when a student states a claim or conclusion with **high confidence and low supporting evidence**.
- Simulates an opposing argument or common misinformation claim related to the topic, **clearly scoped to the current source material**, and asks the student to evaluate its credibility without presenting it as the agent's own belief.

### Implementation Details
- **High-Confidence + Low-Evidence Detector ([`src/app/module/[moduleId]/inquire/page.tsx`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/app/module/%5BmoduleId%5D/inquire/page.tsx))**:
  - Trigger `'DevilsAdvocate'` when manually enabled, when tone is `devils_advocate`, randomly (`Math.random() < 0.3`), or when high-confidence assertions are paired with low supporting evidence.
  - Trigger `'Scaffolding'` mode when the student has `0` notes/nodes and asks for guidance.
- **Source-Scoped Prompting ([`inquire/messages/route.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/app/api/modules/%5BmoduleId%5D/inquire/messages/route.ts) & [`aiService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/ai/aiService.ts))**:
  - Inject the active topic's source titles and excerpts from `sourcesStore` into `ModuleSnapshot.sources`.

---

## Stage 5: Non-Blocking Contextual Nudges & Friendly Error/Retry UX (`requirements.md` Sec 3 L32 & Sec 4 L61)

### Requirements
- If a student enters Inquire/Evaluate or Synthesise without having interacted with any source in Familiarise, show a non-blocking dismissible nudge.
- If AI generation fails, show a friendly explanatory message and a **Retry** option rather than a blocked UI.

### Implementation Details
- Fix `notesCount` synchronization in `inquire/page.tsx` and `synthesise/page.tsx` using `Math.max(localNotesCount, serverNotesCount)`.
- Add an inline **Retry** button inside error/rate-limit bubbles across `familiarise`, `conceptualise`, `inquire`, and `synthesise`.

---

## Stage 6: Student-Scoped & Server-Persisted Agent Preferences (`requirements.md` Sec 3 L32, Sec 7 L107–111, Sec 8 L223)

### Requirements
- Persist `agentPersonality`, `agentAppearance`, and `avatarName` per student in both client storage and server `studentsStore` via `PUT /api/students/:studentId/agent-preferences`.

### Implementation Details
- Update [`src/app/api/students/[studentId]/agent-preferences/route.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/app/api/students/%5BstudentId%5D/agent-preferences/route.ts) to persist preferences in `studentsStore` and call `saveStoreToDisk()`.
- Scope `critic_agent_preferences` in `localStorage` by student ID in [`RobotAvatar.tsx`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/shared/components/RobotAvatar/RobotAvatar.tsx) and [`dashboard/page.tsx`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/app/dashboard/page.tsx).

---

## Stage 7: End-of-Module AI Review Stats, MBTI Summary & Review Screen (`requirements.md` Sec 3 L32 & Sec 9 `screens_v2/review.png`)

### Requirements
- Display the 4 required end-of-module statistics (with corresponding badges):
  1. **Number of ideas across different sources**
  2. **Number of assumptions and biases flagged**
  3. **Number of concept nodes and links made**
  4. **Number of words in conclusion**
- Generate a short, informal, non-clinical **MBTI-like summary** of the student's reasoning approach using the student's selected tone.
- Align the Review screen layout with [`screens_v2/review.png`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/screens_v2/review.png) and Section 9 tokens (`#37F3FF`, `#0F172E`, `#EAF6FF`, `#D9DFF7`, `Space Grotesk`, `Exo 2`).
