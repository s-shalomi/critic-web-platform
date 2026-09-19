System Design and Specifications

# Purpose of this document

This document outlines the requirements, design details, architecture details and development rules for an AI software development agent. It must be used as the single source of truth for implementing the system.

This document is for the development of a web-based educational platform that utilises a gamified interface, an AI agent using Socratic Questioning and scaffolding methods to enhance critical thinking skills in teenagers aged 17-19.

# Instructions to Agent

1. Adhere exactly to this document and do not invent requirements or make significant design decisions without requesting confirmation.
2. Commit code after completion of each feature and file setup. Isolates changes in order to allowing other agents or developers to rollback or branch out easily.
3. Keep track of progress inside a central log file (e.g., PROGRESS.md). The log should state exactly what code was built, what dependencies were introduced, what tests are passing, and what the immediate next step is
4. Document all files, functions and sections of code and write relevant README.md files for each domain.
5. Ensure the system is easily modifiable and extensible. Specifically, adding new topics should require no changes to the core logic
6. When a requirement is ambiguous or a design decision is not specified in this document, the agent should propose an option and flag it clearly in PROGRESS.md rather than silently deciding
7. Never hard-code content that is expected to change per topic

# System Requirements

## Assumptions

- There are 2 roles
  - Students: students authenticate via an access code and progress through the stages of each module.
  - Teachers: teachers create and provide access codes for students. Teachers can authenticate using their email address and a password. They manage sources for each topic and can view student progress.
- Students are provided with a unique access code to access their account
- Climate change is the only available initial topic, all other topics are labelled 'Coming Soon'
- No LLM budget exists
- Students have continuous internet access, to interact with the LLM
- Any teacher can view any student's progress and can manage sources for any topic

## Requirements

<div class="joplin-table-wrapper"><table><tbody><tr><th><p><strong>Requirement</strong></p></th><th><p><strong>Acceptance Criteria</strong></p></th></tr><tr><td><p>Students can only access the platform using an identification code specific to them</p></td><td><p>A valid code redirects the student to the homepage for their session. An invalid code shows a generic error message</p></td></tr><tr><td><p>Students can choose a topic to explore. Currently, only 'climate change' is available to explore, however, other topics will be marked as 'Coming Soon'.</p></td><td><p>All topics are visible but only 'Climate Change' can be entered</p></td></tr><tr><td><p>Familiarise stage: students can highlight text on the given sources and create notes on their thoughts, assumptions and biases. Each note a student makes has a 'Convert to node' option that pushes the note as a concept node in the conceptualise stage's canvas.</p></td><td><p>Highlights and notes are saved automatically and persist on reloads. If a note is converted to a node, it appears as a concept node in the conceptualise stage</p></td></tr><tr><td><p>Familiarise and Conceptualise Stages: Students can click on the AI agent avatar to be provided hints regarding the sources on screen.</p></td><td><p>The agent provides a Socratic Question related to the content on screen and the user's current progress.</p></td></tr><tr><td><p>Conceptualise stage: students can create, drag and link nodes. Students can also insert text (concepts identified) into these nodes.</p></td><td><p>Nodes and links persist after reload, with their positions preserved</p></td></tr><tr><td><p>Inquire and evaluate stage: the AI agent chatbot will ask students Socratic Questions to prompt them to challenge their assumptions, ask questions, explore alternatives and evaluate and assess credibility of evidence. The AI agent may also offer opposing arguments to the student's claims for them to evaluate.</p></td><td><p>The AI agent does not give students any direct factual claims or opinions</p></td></tr><tr><td><p>Synthesise stage: the student writes a synthesis of the module, and the agent helps by providing probing, Socratic Questions.</p></td><td><p>The agent checks the student's synthesis against what was said in the previous stages to verify it and highlights missing links or arguments.</p></td></tr><tr><td><p>At the end of the stages, the AI agent reviews the students progress and shows statistics of how well they performed. Statistics will include:</p><ul><li>Number of concepts identified</li><li>Assumptions challenged and questions asked</li><li>Misinformation evaluations</li><li>Critical Thinking Abilities</li><li>Synthesis of information</li></ul><p>A small MBTI-like summary about the student's progress is also generated (a short, informal, non-clinical personality-style summary of the student's reasoning approach during the module).</p></td><td><p>These 6 values (with corresponding badges) and the summary are displayed on the final screen on module completion.</p></td></tr><tr><td><p>Stage progression is flexible, allowing open exploration while using AI nudges to guide the learning flow</p></td><td><p>All stages can be accessed once the module starts. If a student attempts to move to a synthesis or inquiry stage without interacting with sources, the AI agent displays a non-blocking contextual nudge</p></td></tr><tr><td><p>Students can freely navigate between and interact in any stage.</p></td><td><p>Progress will update and persist if a student goes to a previous stage and makes a change or adds something.</p></td></tr><tr><td><p>Progress (stage state + review stats) is saved per stage, per module/topic</p></td><td><p>Reopening a topic reloads the student to their exact stage and state. Progress survives session end and reload</p></td></tr><tr><td><p>Students can customise the agent's avatar/appearance and personality (tone only) from predefined options.</p></td><td><p>Changing personality changes response phrasing tone and questioning style .</p></td></tr><tr><td><p>Same AI agent persists across the whole module with full context of the student's inputs.</p></td><td><p>Agent can reference an artefact from an earlier stage within the same module.</p></td></tr><tr><td><p>The AI agent acts as a peer to the student, with Socratic Questioning and Devil's Advocate modes. It must be made clear to the student that the AI agent may do this and to not trust what the AI agent says at the beginning of the module.</p></td><td><p>The agent does not deliver direct factual opinions. For analytical prompts, the agent responds with Socratic questioning or presents counter-perspectives to test student reasoning. The agent offers a Devil's Advocate where it simulates common opposing arguments or misinformation claims for the student to critique</p></td></tr><tr><td><p>Teacher authentication is separate to student authentication</p></td><td><p>Teachers have a separate login form</p></td></tr><tr><td><p>Teachers can add, remove and edit sources for each module.</p></td><td><p>Add/edit/remove reflected immediately in the familiarise and conceptualise stages source list.</p></td></tr><tr><td><p>Teachers can generate new access codes for students</p></td><td><p>Each generated access code is valid.</p></td></tr><tr><td><p>The platform provides immediate feedback on user actions, including loading indicators.</p></td><td><p>Every action that takes time to complete has a loading indicator (i.e., if the AI chat takes time to respond)</p></td></tr><tr><td><p>The platform is responsive and portable across devices</p></td><td><p>The platform must be usable on desktop, tablet and mobile viewports</p></td></tr><tr><td><p>Students are identified only by an access code, never by name or email. Teacher credentials are hashed</p></td><td><p>No student table column stores name, email, or other direct identifiers.</p></td></tr><tr><td><p>JWT session tokens expire after a defined period of inactivity and are refreshed on activity. Expired sessions redirect to the appropriate login screen without losing unsaved work</p></td><td><p>A session left idle beyond the timeout requires re-authentication</p></td></tr><tr><td><p>The system must operate within Gemini's free-tier rate limits, falling back to Groq automatically on failure or rate-limit responses. If both providers fail, the student sees a clear, friendly error rather than a blocked UI.</p></td><td><p>Simulated Gemini failure/rate-limit triggers an automatic Groq call within the same request without a visible page reload. If both fail, a retry option and explanatory message are shown</p></td></tr><tr><td><p>Perceived AI response time should not exceed ~10 seconds under normal load before a loading indicator gives way to a response or a timeout message.</p></td><td><p>A loading indicator appears for messages after 10 seconds</p></td></tr><tr><td><p>Adding a new topic must not require changes to stage logic, only new rows in the Topics and Sources tables</p></td><td></td></tr></tbody></table></div>

# AI Agent Requirements

At the start of every module, before any AI interaction, the student must see a short, disclosure explaining that:

1. the agent will use Socratic questioning and may take a Devil's Advocate position;
2. the agent may present arguments it does not itself 'believe' in order to test reasoning
3. the student should not treat the agent's statements as verified fact.

Agent Core Behaviour:

- The agent must never state a direct factual claim, opinion, or verdict on the topic content
- Every substantive agent turn should end in a question, a prompt to reconsider, or a counter-perspective
- The agent must reference the student's own prior inputs (notes, nodes, chat history) within the same module wherever relevant
- The agent must not fabricate sources or citations. If asked for evidence, it should direct the student back to the provided sources or ask the student to find supporting/contradicting evidence themselves
- The agent must not use definitive phrases like "That is correct," or "You are wrong".

Stage specific behaviour:

- Familiarise and Conceptualise Stages:
  - Devil's Advocate mode can be triggered randomly
  - When student clicks on avatar, the agent asks one Socratic Question related to the source currently in view and the student's existing notes/nodes
  - Inquire and evaluate stage: prompt the student to question assumptions, seek alternative viewpoints, and assess evidence credibility
  - Synthesise stage: compare the student's draft synthesis against notes, nodes and chat history from earlier stages; identify missing links or unaddressed counterarguments and phrase these as questions rather than corrections
  - Nudges: if a student attempts to enter Inquire/Evaluate or Synthesise without having interacted with any source in Familiarise, show a non-blocking suggestion (e.g. a dismissible banner)

Devil's Advocate Mode:

- Triggered randomly and also when a student states a claim or conclusion with high confidence and low supporting evidence
- The agent simulates an opposing argument or a common misinformation claim related to the topic, clearly scoped to the current source material, and asks the student to evaluate its credibility.
- The agent must not present content in a way that could be mistaken as the agent's own view

## AI Prompt Strategy

To keep costs low and prevent context window overflow:

- Include only the last 10 turns of dialogue in raw text. Older conversation turns are summarized into a short string
- Every conversation turn contains:
  - Base personality and tone
  - Agent mode: Socratic, Devil's Advocate or Scaffolding
  - Snapshot of the module, including topic title, current stage, notes taken, concept nodes and student's synthesis (if in synthesis stage)

# Enhancements

1. Storify each topic: the student is building a casefile on each topic and each stage is a stage of the investigation
   - Familiarise stage: student gathers evidence
   - Conceptualise stage: student creates a visual map of the case
   - Inquire and evaluate stage: student evaluates and interrogates the claims
   - Synthesise stage: student closes the case
2. Enhance the concept map
   - Give nodes small visual growth and a subtle glow as they accumulate more links, so the map visibly reflects developing understanding
   - Use lightweight animation and sound feedback when a link is created
   - Use physics-like drag behaviour (slight momentum)
3. Enhance module review
   - Animate badges unlocking one at a time
   - Design the MBTI-like summary as a shareable card
4. AI Agent customisation
   - Student can customise avatar appearance and name it
   - Each personality tone should feel like a distinct character voice
   - All AI agent messages should be delivered in the chosen tone

# Tech Stack

- Frontend and Backend: NextJS
- Database: PostgreSQL with JSONB for concept-map node/link data
- LLM: Gemini free tier with Groq as fallback
- Hosting: Vercel free tier
- Database hosting: Supabase free tier
- Authentication: JWT session tokens

# Architecture

Modular monolithic architecture: one NextJS codebase organised into domains:

- Authentication (student access-code login, teacher email/password login, JWT issuance and verification)
- Topics
- Stages
- AI agent (prompt construction, Gemini/Groq client, personality layer, guardrails)
- Review summary
- Review stats
- Teacher only access
- Sources

An authentication layer should exist in front of all API routes to ensure a JWT authenticated session exists before executing a route.

# Database Schemas

Field lists are logical, not exhaustive.

- Students:
  - Student ID
  - Access code
  - Agent personality
  - Agent appearance
  - Avatar name
  - Created at
  - Last login at
- Teachers:
  - Name
  - Email
  - Password
  - Created at timed
- Access codes
  - Id
  - Code
  - Teacher id
  - Created at
  - Expires at
- Topics
  - Topic id
  - Status (Available, coming soon)
  - Title
  - Description
- Sources
  - Id
  - Topic id
  - Created at
  - Created by
  - Updated at
  - Updated by
  - Order index
  - Title
  - Content (JSON)
  - URL
- Modules (one active module per (student_id, topic_id))
  - Id
  - Student id
  - Topic id
  - Status
  - Current stage
  - Created at
  - Updated at
- Notes
  - Id
  - Module id
  - Source id
  - Highlighted text
  - Note text
  - Created at
  - Updated at
  - Converted to node
- Concept nodes
  - Id
  - Module id
  - Text
  - Position x
  - Position y
  - Source note id (nullable)
  - Created at
  - Updated at
- Concept links
  - Id
  - Module id
  - From node id
  - To node id
  - Created at
  - Updated at
- Chat messages
  - Id
  - Module id
  - Stage
  - Sender (student, agent)
  - Text
  - Message type
  - Created at
- Review summary
  - Id
  - Module id
  - Summary title
  - Summary text
  - Created at
- Review stats
  - Id
  - Module id
  - Stats (JSON)
  - Created at

# Minimum API Contracts

This is only a baseline and not exhaustive.

| Method       | Route                                      | Comments                                                                                    |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| POST         | /api/auth/student-login                    | Access-code login.                                                                          |
| POST         | /api/auth/teacher-login                    | Teacher only.                                                                               |
| GET          | /api/topics                                | List all topics with status.                                                                |
| GET          | /api/topics/:topicId/sources               | List sources for a topic.                                                                   |
| POST         | /api/topics/:topicId/sources               | Teacher only.                                                                               |
| PUT / DELETE | /api/sources/:sourceId                     | Teacher only.                                                                               |
| GET          | /api/modules/:moduleId/familiarise         | Sources, existing highlights/notes and current stage state.                                 |
| POST         | /api/modules/:moduleId/notes               | Create a note (highlight + note text + position).                                           |
| PUT / DELETE | /api/notes/:noteId                         | Edit or remove a note.                                                                      |
| POST         | /api/notes/:noteId/convert-to-node         | Converts a note into a concept node                                                         |
| GET          | /api/modules/:moduleId/conceptualise       | Existing nodes and links, and current stage state.                                          |
| POST         | /api/modules/:moduleId/concepts            | Create a concept node.                                                                      |
| PUT / DELETE | /api/concepts/:nodeId                      | Edit position/text or remove a node                                                         |
| POST         | /api/modules/:moduleId/concepts/links      | Create a link between two nodes.                                                            |
| DELETE       | /api/links/:linkId                         | Remove a link                                                                               |
| GET          | /api/modules/:moduleId/inquire             | Chat history and stage state for the Inquire/Evaluate stage.                                |
| POST         | /api/modules/:moduleId/inquire/messages    | Send a student message; returns the agent's Socratic/Devil's Advocate reply                 |
| GET          | /api/modules/:moduleId/synthesis           | Existing synthesis draft, if any, and stage state.                                          |
| POST         | /api/modules/:moduleId/synthesis           | Submit or update the synthesis draft; triggers the agent's cross-check against prior stages |
| POST         | /api/modules/:moduleId/agent/hint          | Requests a Socratic hint from the avatar in the Familiarise/Conceptualise stages            |
| GET          | /api/modules/:moduleId/review              | Retrieve review stats and summary if already generated.                                     |
| POST         | /api/modules/:moduleId/review/generate     | Generates the review stats and MBTI-like summary on module completion                       |
| PUT          | /api/students/:studentId/agent-preferences | Update agent personality/appearance selection                                               |
| GET          | /api/teachers/:teacherId/students          | List students and their progress across modules                                             |
| POST         | /api/teachers/access-codes                 | Teacher only to generate new access code for student                                        |

# User Interface

Before implementing any screen, pull the supplied typography and colour values into a single shared config. Reference the config everywhere; never hard-code a raw hex value or font name inside a component.

Build screens without a reference image using the same config file so that all screens are visually consistent.

Note that the UI is subject to change, so implement it with the flexibility to be changed later on.

## Screens

| Screen Image Name (png files in screens directory)                                                                 | Typography                                                                                             | Colours                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Landing page                                                                                                       | Orbitron Bold<br><br>Space Grotesk<br><br>Audiowide<br><br>Exo 2<br><br>Inclusive Sans<br><br>Rajdhani | 0F172E<br><br>070B1A<br><br>FF4FD8<br><br>37F3FF 20%<br><br>EAF6FF<br><br>D9DFF7<br><br>8FA6C9 45%               |
| Intro to familiarise<br><br>Intro to conceptualise<br><br>Intro to inquire and evaluate<br><br>Intro to synthesise | Space Mono<br><br>Audio wide                                                                           | 0F172E<br><br>D9DFF7<br><br>EAF6FF 60%                                                                           |
| Familiarise                                                                                                        | Exo 2<br><br>Audiowide<br><br>Inclusive Sans                                                           | 0F172E<br><br>53A0C4<br><br>EAF6FF<br><br>37F3FF<br><br>37F3FF 50%<br><br>445168 50%<br><br>070B1A               |
| Conceptualise<br><br>Inquire and evaluate<br><br>Synthesise                                                        | Exo 2<br><br>Audiowide<br><br>Inclusive Sans                                                           | FF4FD8<br><br>0F172E<br><br>53A0C4<br><br>EAF6FF<br><br>37F3FF<br><br>37F3FF 50%<br><br>445168 50%<br><br>070B1A |

# Implementation Plan

Don't build the platform in one turn.

First create an implementation plan and seek approval before continuing. Build the platform in stages.