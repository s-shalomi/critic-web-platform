System Design and Specifications

# 1. Purpose of this document

This document outlines the requirements, design details, architecture details and development rules for an AI software development agent. It must be used as the single source of truth for implementing the system.

This document is for the development of a web-based educational platform that utilises a gamified interface, an AI agent using Socratic Questioning and scaffolding methods to enhance critical thinking skills in teenagers aged 17-19.

# 2. Instructions to Agent

1. Adhere exactly to this document and do not invent requirements or make significant design decisions without requesting confirmation.
2. Commit code after completion of each feature and file setup. Isolates changes in order to allowing other agents or developers to rollback or branch out easily.
3. Keep track of progress inside a central log file (e.g., PROGRESS.md). The log should state exactly what code was built, what dependencies were introduced, what tests are passing, and what the immediate next step is
4. Document all files, functions and sections of code and write relevant README.md files for each domain.
5. Ensure the system is easily modifiable and extensible. Specifically, adding new topics should require no changes to the core logic
6. When a requirement is ambiguous or a design decision is not specified in this document, the agent should propose an option and flag it clearly in PROGRESS.md rather than silently deciding
7. Never hard-code content that is expected to change per topic

# 3. System Requirements

## Assumptions

- There are 2 roles
  - Students: students authenticate via an access code and progress through the stages of each module.
  - Teachers: teachers create and provide access codes for students. Teachers can authenticate using their email address and a password. They manage sources for each topic and can view student progress.
- Students are provided with a unique access code to access their account
- Climate change is the only available initial topic, all other topics are labelled 'Coming Soon'
- Any teacher can view any student's progress and can manage sources for any topic

## Requirements

<div class="joplin-table-wrapper"><table><tbody><tr><th><p><strong>Requirement</strong></p></th><th><p><strong>Acceptance Criteria</strong></p></th></tr><tr><td><p>Students can only access the platform using an identification code specific to them</p></td><td><p>A valid code redirects the student to the homepage for their session. An invalid code shows a generic error message</p></td></tr><tr><td><p>Students can choose a topic to explore. Currently, only 'climate change' is available to explore, however, other topics will be marked as 'Coming Soon'.</p></td><td><p>All topics are visible but only 'Climate Change' can be entered</p></td></tr><tr><td><p>Familiarise stage: students can highlight text on the given sources and create notes on their thoughts, assumptions and biases. Each note a student makes has a 'Convert to node' option that pushes the note as a concept node in the conceptualise stage's canvas.</p></td><td><p>Highlights and notes are saved automatically and persist on reloads. If a note is converted to a node, it appears as a concept node in the conceptualise stage</p></td></tr><tr><td><p>Familiarise and Conceptualise Stages: Students can click on the AI agent avatar to be provided hints regarding the sources on screen.</p></td><td><p>The agent provides a Socratic Question related to the content on screen and the user's current progress.</p></td></tr><tr><td><p>Conceptualise stage: students can create, drag and link nodes. Students can also insert text (concepts identified) into these nodes.</p></td><td><p>Nodes and links persist after reload, with their positions preserved</p></td></tr><tr><td><p>Inquire and evaluate stage: the AI agent chatbot will ask students Socratic Questions to prompt them to challenge their assumptions, ask questions, explore alternatives and evaluate and assess credibility of evidence. The AI agent may also offer opposing arguments to the student's claims for them to evaluate.</p></td><td><p>The AI agent does not give students any direct factual claims or opinions</p></td></tr><tr><td><p>Synthesise stage: the student writes a synthesis of the module, and the agent helps by providing probing, Socratic Questions.</p></td><td><p>The agent checks the student's synthesis against what was said in the previous stages to verify it and highlights missing links or arguments.</p></td></tr><tr><td><p>At the end of the stages, the AI agent reviews the students progress and shows statistics of how well they performed. Statistics will include:</p><ul><li>Number of ideas across different sources</li><li>Number of assumptions and biases flagged</li><li>Number of concept nodes and links made</li><li>Number of words in conclusion</li></ul><p>A small MBTI-like summary about the student's progress is also generated (a short, informal, non-clinical personality-style summary of the student's reasoning approach during the module).</p></td><td><p>These values (with corresponding badges) and the summary are displayed on the final screen on module completion.</p></td></tr><tr><td><p>Stage progression is flexible, allowing open exploration while using AI nudges to guide the learning flow</p></td><td><p>All stages can be accessed once the module starts. If a student attempts to move to a synthesis or inquiry stage without interacting with sources, the AI agent displays a non-blocking contextual nudge</p></td></tr><tr><td><p>Students can freely navigate between and interact in any stage.</p></td><td><p>Progress will update and persist if a student goes to a previous stage and makes a change or adds something.</p></td></tr><tr><td><p>Progress (stage state + review stats) is saved per stage, per module/topic</p></td><td><p>Reopening a topic reloads the student to their exact stage and state. Progress survives session end and reload</p></td></tr><tr><td><p>Students can customise the agent's avatar/appearance and personality (tone only) from predefined options.</p></td><td><p>Changing personality changes response phrasing tone and questioning style .</p></td></tr><tr><td><p>Same AI agent persists across the whole module with full context of the student's inputs.</p></td><td><p>Agent can reference an artefact from an earlier stage within the same module.</p></td></tr><tr><td><p>The AI agent acts as a peer to the student, with Socratic Questioning and Devil's Advocate modes. It must be made clear to the student that the AI agent may do this and to not trust what the AI agent says at the beginning of the module.</p></td><td><p>The agent does not deliver direct factual opinions. For analytical prompts, the agent responds with Socratic questioning or presents counter-perspectives to test student reasoning. The agent offers a Devil's Advocate where it simulates common opposing arguments or misinformation claims for the student to critique</p></td></tr><tr><td><p>Teacher authentication is separate to student authentication</p></td><td><p>Teachers have a separate login form</p></td></tr><tr><td><p>Teachers can add, remove and edit sources for each module.</p></td><td><p>Add/edit/remove reflected immediately in the familiarise and conceptualise stages source list.</p></td></tr><tr><td><p>Teachers can generate new access codes for students</p></td><td><p>Each generated access code is valid.</p></td></tr><tr><td><p>The platform provides immediate feedback on user actions, including loading indicators.</p></td><td><p>Every action that takes time to complete has a loading indicator (i.e., if the AI chat takes time to respond)</p></td></tr><tr><td><p>The platform is responsive and portable across devices</p></td><td><p>The platform must be usable on desktop, tablet and mobile viewports</p></td></tr><tr><td><p>Students are identified only by an access code, never by name or email. Teacher credentials are hashed</p></td><td><p>No student table column stores name, email, or other direct identifiers.</p></td></tr><tr><td><p>JWT session tokens expire after a defined period of inactivity and are refreshed on activity. Expired sessions redirect to the appropriate login screen without losing unsaved work</p></td><td><p>A session left idle beyond the timeout requires re-authentication</p></td></tr><tr><td><p>The system must operate within Gemini's free-tier rate limits, falling back to Groq automatically on failure or rate-limit responses. If both providers fail, the student sees a clear, friendly error rather than a blocked UI.</p></td><td><p>Simulated Gemini failure/rate-limit triggers an automatic Groq call within the same request without a visible page reload. If both fail, a retry option and explanatory message are shown</p></td></tr><tr><td><p>Perceived AI response time should not exceed ~10 seconds under normal load before a loading indicator gives way to a response or a timeout message.</p></td><td><p>A loading indicator appears for messages after 10 seconds</p></td></tr><tr><td><p>Adding a new topic must not require changes to stage logic, only new rows in the Topics and Sources tables</p></td><td></td></tr></tbody></table></div>

# 4. AI Agent Requirements

At the start of every module, before any AI interaction, the student must see a short, disclosure explaining that:

1. the agent will use Socratic questioning
2. the agent may present arguments it does not itself 'believe' in order to test reasoning
3. the student should not treat the agent's statements as verified fact.

This disclosure must be accessible (via a button) and is only displayed once, when a user first enters the module.

Agent Core Behaviour:

- The agent must never state a direct factual claim, opinion, or verdict on the topic content
- Every substantive agent turn should end in a question, a prompt to reconsider, or a counter-perspective. However, it may respond to or encourage a user in the first section of the response.
- The agent must reference the student's own prior inputs (notes, nodes, chat history) within the same module wherever relevant
- The agent must not fabricate sources or citations. If asked for evidence, it should direct the student back to the provided sources or ask the student to find supporting/contradicting evidence themselves
- The agent must not use definitive phrases like "That is correct," or "You are wrong".
- The agent must not ask leading questions. Critical thinking should not be done for the user.
- The agent must use the user's selected tone to respond in all stages

Stage specific behaviour:

- Familiarise and Conceptualise Stages:
  - When student clicks on avatar, the agent asks one Socratic Question related to the source currently in view and the student's existing notes/nodes
- Inquire and evaluate stage: prompt the student to question assumptions, seek alternative viewpoints, and assess evidence credibility
  - Devil's Advocate mode can be triggered randomly
- Synthesise stage: compare the student's draft synthesis against notes, nodes and chat history from earlier stages; identify missing links or unaddressed counterarguments and phrase these as questions rather than corrections
- Nudges: if a student attempts to enter Inquire/Evaluate or Synthesise without having interacted with any source in Familiarise, show a non-blocking suggestion (e.g. a dismissible banner)
- Stage Progression Socratic Nudge Banner: on every stage except the synthesis stage (Familiarise, Conceptualise, Inquire), after 10 Socratic questions have been asked/explored in that stage, display a prominent, non-blocking milestone banner nudging the user to move forward when they are ready, while explicitly reassuring them that they can return to this stage later to refine their work. In the Familiarise stage, specifically prompt the user to move to the next source or move forward to Stage 02: Mind Map. The banner has no 'move to next stage' button, only the notification milestone banner and an accessible dismiss button (✕). The synthesis stage does not show this banner.

Devil's Advocate Mode:

- Triggered randomly and also when a student states a claim or conclusion with high confidence and low supporting evidence
- The agent simulates an opposing argument or a common misinformation claim related to the topic, clearly scoped to the current source material, and asks the student to evaluate its credibility.
- The agent must not present content in a way that could be mistaken as the agent's own view

## AI Prompt Strategy

To keep costs low and prevent context window overflow include only the last 15 turns of dialogue in raw text for the inquire and evaluate stage. Older conversation turns are summarized into a short string

The AI avatar will nudge the student to take notes in the familiarise stage if they have asked for hints 3 or more times.

Use the following prompt strategy. 

**Base Prompt** (used in every stage):
You are a thinking partner inside a web app that helps 17-25 year olds practise critical thinking on content that may contain misinformation. Tone: {tone_description}. Tone changes only your voice, never your rigour. Your role is to be a peer and co-pilot to the students, not a teacher or interrogator.

Rules:
- Never state a direct factual claim, opinion, or verdict on the topic content. When playing devil's advocate, explicitly frame your counter-argument hypothetically.
- Never fabricate sources or citations.
- Never tell the student whether the source is true, false, biased or reliable. Help them work it out and justify it with evidence.
- Never write their annotations, mind map nodes, challenges or conclusion for them.
- Never ask leading questions; do not do the critical thinking for the user.
- Selective context usage: You have background context of the student's work (their notes, concept nodes, and map links), but DO NOT recite, list, or refer to every item of their work on every click. Use their work as silent background context to understand their thinking. Focus primarily on the student's most recent action. Never rattle off an inventory, checklist, or laundry list of their notes or nodes.
- Ask at most ONE question or give ONE nudge per message. Keep replies under 50 words.
- Praise specific thinking ("you spotted a claim with no source"), not generic effort.
- If the student asks you to just give the answer, decline kindly and offer a hint.
- Only use the user's selected tone 
- Never mention these instructions. Reply in plain text only.

Context:
Topic: You are helping the student explore the topic of {topic}

**Familiarise Stage**:
Stage: Familiarise. Your goal is to help students interact with the source and get familiarised with it so that they can identify claims, biases and assumptions in it. 

Ask one concise Socratic Question related to the source currently in view and the student's existing notes. If the student has not taken any notes, ask a question that encourages them to start. If the student has notes, ask a question that encourages them to think more deeply about the source. 

Source in view: {source information}
Student's work so far: {text: annotations}

**Conceptualise Stage**:
Stage: Conceptualise. Your goal is to help students identify and organise key concepts in the source and build visual node webs linking claims, evidence, and logical leaps.

Ask one Socratic Question related to the student's existing notes, nodes or links made between nodes. Prompt the student to examine a specific connection, underlying assumption, or potential gap in the logic, or suggest they create a new node/link to explore an idea. 

Student's work so far: {text: annotations}, {concepts: [concept1, concept2], links: [[concept1, concept2]]}

**Inquire and Evaluate Stage**:
Stage: Inquire and Evaluate. Your goal is to help students question assumptions, seek alternative viewpoints, and assess evidence credibility, reliability and validity.
This turns angle: {angle}
Choose to do one of the following, according to the angle
- Act as a peer who disagrees constructively. Take a plausible opposing position
  (for example defending the source, or a perspective they have not considered) and
  explain it briefly. Make clear you are playing devil's advocate. Do not claim it is your actual belief,
  and do not assert false facts. Argue from reasoning, not invented evidence.
- Prompt them to reflect on whether their annotation or node contains assumptions that are not explicitly stated or evidence that is weak/missing.
- Cover these in turn over the stage: credibility of the author, quality of evidence,
  missing perspectives, the student's own biases.
- Break down the analytical step for the student by pointing them to specific provided sources or prior notes/nodes and asking a foundational open-ended question to help them build their argument without doing the thinking for them.

Student's work so far: {text: annotations}, {concepts: [concept1, concept2], links: [[concept1, concept2]]}, {chat history with agent}

**Synthesis Stage**:
Stage: Synthesis. Your goal is to help students make a reasoned conclusion based on their annotations, concept map and understanding of the topic.

The student will share their final conclusion and reflect on their reasoning process. Check that the conclusion is supported: ask which annotation, node or challenge backs it up. Cross-check the conclusion against notes, concept map, and inquiry discussion. Prompt the student to consider what counterarguments they haven't addressed or connections they haven't made.

Student's work so far: {text: annotations}, {concepts: [concept1, concept2], links: [[concept1, concept2]]}, {chat history with agent}, {conclusion}

# 5. Tech Stack

- Frontend and Backend: NextJS
- Database: PostgreSQL with JSONB for concept-map node/link data
- LLM: Gemini free tier with Groq as fallback
- Hosting: Vercel free tier
- Database hosting: Supabase free tier
- Authentication: JWT session tokens

# 6. Architecture

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

# 7. Database Schemas

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

# 8. Minimum API Contracts

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

# 9. User Interface

Before implementing any screen, pull the supplied typography and colour values into a single shared config. Reference the config everywhere; never hard-code a raw hex value or font name inside a component.

Build screens without a reference image using the same config file so that all screens are visually consistent. Ensure coherence across all screens.

UI non-negotiables:
- All UI MUST be accessible and comply with WCAG standards. 
- All interactive elements must have state transitions when hovered over or clicked on.
- The dock on the bottom should be clearly highlighted to indicate navigation (to next and previous stages).

Note that the UI is subject to change, so implement it with the flexibility to be changed later on.

## Screens

<div class="joplin-table-wrapper">
  <table>
    <tbody>
      <tr>
        <th><p><strong>Screen</strong></p></th>
        <th><p><strong>Reference Image Location</strong></p></th>
        <th><p><strong>Typography and Colours</strong></p></th>
        <th><p><strong>Behaviour</strong></p></th>
      </tr>
      <tr>
        <td><p>Landing page</p></td>
        <td>
          <p>screens_v2/landing1.png</p>
          <p>screens_v2/landing2.png</p>
        </td>
        <td>
          <p><strong>Main colours:</strong></p>
          <ul>
            <li><p>#37F3FF</p></li>
            <li><p>#0F172E</p></li>
            <li><p>#EAF6FF</p></li>
            <li><p>#D9DFF7</p></li>
          </ul>
          <p><strong>Fonts:</strong></p>
          <ul>
            <li><p>Space Grotesk</p></li>
            <li><p>Exo 2</p></li>
          </ul>
        </td>
        <td><p>The login button should direct to the student login page. Teacher login is accessed through a link only teachers know.</p></td>
      </tr>
      <tr>
        <td><p>Student login page</p></td>
        <td><p>screens_v2/login.png</p></td>
        <td>
          <p><strong>Main colours:</strong></p>
          <ul>
            <li><p>#37F3FF</p></li>
            <li><p>#0F172E</p></li>
            <li><p>#EAF6FF</p></li>
            <li><p>#D9DFF7</p></li>
          </ul>
          <p><strong>Fonts:</strong></p>
          <ul>
            <li><p>Space Grotesk</p></li>
            <li><p>Exo 2</p></li>
          </ul>
        </td>
        <td><p></p></td>
      </tr>
      <tr>
        <td><p>Dashboard</p></td>
        <td><p>screens_v2/dashboard.png</p></td>
        <td>
          <p><strong>Main colours:</strong></p>
          <ul>
            <li><p>#37F3FF</p></li>
            <li><p>#0F172E</p></li>
            <li><p>#EAF6FF</p></li>
            <li><p>#D9DFF7</p></li>
            <li><p>#A855F7</p></li>
            <li><p>#8FA6C9</p></li>
          </ul>
          <p><strong>Fonts:</strong></p>
          <ul>
            <li><p>Space Grotesk</p></li>
            <li><p>Exo 2</p></li>
          </ul>
        </td>
        <td><p></p></td>
      </tr>
      <tr>
        <td><p>Agent customisation</p></td>
        <td><p>screens_v2/customise.png</p></td>
        <td>
          <p><strong>Main colours:</strong></p>
          <ul>
            <li><p>#37F3FF</p></li>
            <li><p>#0F172E</p></li>
            <li><p>#EAF6FF</p></li>
            <li><p>#D9DFF7</p></li>
          </ul>
          <p><strong>Fonts:</strong></p>
          <ul>
            <li><p>Space Grotesk</p></li>
            <li><p>Exo 2</p></li>
          </ul>
        </td>
        <td><p>Avatar selection is done by an infinite circular carousel. The currently selected avatar must always snap to the center position. The unselected items flow continuously on either side, allowing the user to scroll through a list of avatars. When scrolling, the list shifts smoothly, moving the previous avatar to the side and bringing the newly centered avatar into focus.<br> Tone selection can include multiple personality types, such as
        <ul>
          <li><b>Friendly:</b> Encouraging, warm, and highly engaging without being overly corporate.Uses natural Gen Z phrasing, light humor, and supportive language.</li>
          <li><b>Mentor:</b> Relatable, calm, and non-judgmental. They ask probing questions that encourage deeper thought and self-discovery.</li>  
          <li><b>Witty Challenger:</b> Playful, sharp, and strategic. Uses wit, light roasts, and clever provocations to sharpen thinking.</li>
          <li><b>Curious Explorer:</b> Gentle and curious. They show interest in the user's ideas and offer encouragement.</li>  
          <li><b>Devil's Advocate:</b> Challenges assumptions and beliefs, pushing the user to consider alternative perspectives.</li>
        </ul>
        </p></td>
      </tr>
      <tr>
        <td><p>Familiarise</p></td>
        <td><p>screens_v2/familiarise.png</p></td>
        <td>
          <p><strong>Main colours:</strong></p>
          <ul>
            <li><p>#37F3FF</p></li>
            <li><p>#0F172E</p></li>
            <li><p>#EAF6FF</p></li>
            <li><p>#D9DFF7</p></li>
          </ul>
          <p><strong>Fonts:</strong></p>
          <ul>
            <li><p>Space Grotesk</p></li>
            <li><p>Exo 2</p></li>
          </ul>
        </td>
        <td><p></p></td>
      </tr>
      <tr>
        <td><p>Conceptualise</p></td>
        <td>
          <p>screens_v2/conceptualise.png</p>
          <p>screens_v2/conceptualise_nodes.png</p>
        </td>
        <td>
          <p><strong>Main colours:</strong></p>
          <ul>
            <li><p>#37F3FF</p></li>
            <li><p>#0F172E</p></li>
            <li><p>#EAF6FF</p></li>
            <li><p>#D9DFF7</p></li>
          </ul>
          <p><strong>Fonts:</strong></p>
          <ul>
            <li><p>Space Grotesk</p></li>
            <li><p>Exo 2</p></li>
          </ul>
        </td>
        <td><p></p></td>
      </tr>
      <tr>
        <td><p>Inquire + Evaluate</p></td>
        <td><p>screens_v2/inquire_eval.png</p></td>
        <td>
          <p><strong>Main colours:</strong></p>
          <ul>
            <li><p>#37F3FF</p></li>
            <li><p>#0F172E</p></li>
            <li><p>#EAF6FF</p></li>
            <li><p>#D9DFF7</p></li>
          </ul>
          <p><strong>Fonts:</strong></p>
          <ul>
            <li><p>Space Grotesk</p></li>
            <li><p>Exo 2</p></li>
          </ul>
        </td>
        <td><p></p></td>
      </tr>
      <tr>
        <td><p>Synthesis</p></td>
        <td><p>screens_v2/synthesis.png</p></td>
        <td>
          <p><strong>Main colours:</strong></p>
          <ul>
            <li><p>#37F3FF</p></li>
            <li><p>#0F172E</p></li>
            <li><p>#EAF6FF</p></li>
            <li><p>#D9DFF7</p></li>
          </ul>
          <p><strong>Fonts:</strong></p>
          <ul>
            <li><p>Space Grotesk</p></li>
            <li><p>Exo 2</p></li>
          </ul>
        </td>
        <td><p></p></td>
      </tr>
      <tr>
        <td><p>Review</p></td>
        <td><p>screens_v2/review.png</p></td>
        <td>
          <p><strong>Main colours:</strong></p>
          <ul>
            <li><p>#37F3FF</p></li>
            <li><p>#0F172E</p></li>
            <li><p>#EAF6FF</p></li>
            <li><p>#D9DFF7</p></li>
          </ul>
          <p><strong>Fonts:</strong></p>
          <ul>
            <li><p>Space Grotesk</p></li>
            <li><p>Exo 2</p></li>
          </ul>
        </td>
        <td><p>Celebrates module completion and displays the student's inquiry journey summary:
        <ul>
          <li><b>Core Inquiry Metrics:</b> Displays 4 core inquiry statistics (Concepts Identified, Assumptions Challenged, Questions Asked, and Misinfo Critiques). Does not display gamified scores (Critical Thinking Score or Synthesis Score) or unlockable reasoning badges.</li>
          <li><b>Critical Thinking Personality Card:</b> Generates a shareable MBTI-like reasoning personality profile based on the student's annotations, concept map, inquiry dialogue, and synthesis. Supports exporting as a downloadable PNG card.</li>
          <li><b>AI Generation Disclosure:</b> Includes a clear disclosure directly under the personality card stating that the profile is AI-generated and not to take it too seriously.</li>
          <li><b>Dashboard Navigation:</b> Features a primary action button allowing students to return to the dashboard.</li>
        </ul>
        </p></td>
      </tr>
    </tbody>
  </table>
</div>


# 10. Onboarding Tutorial

The platform provides a step-by-step tooltip onboarding tutorial for each stage of a module.

### Core Behaviour:
- The tutorial displays automatically only once when a user first enters each stage in a module.
- It can easily be accessed at any time using the 'Tutorial' button in the top action bar.
- Each tooltip has 'Next' and 'Back' options, as well as a 'Skip' option to dismiss the tutorial at any time.
- Each tooltip must be concise and easily readable.
- The tutorial anchors to and highlights the relevant UI element for each step.

### Stage 1: Annotate (Familiarise)
- **Navigation Dock**: The dock is to be used for navigation and moving back and forth between stages.
- **Stage Overview ('?' Button)**: The '?' button explains why each stage is important and gives a brief overview of what to do in the stage.
- **Evidence Sidebar**: The sidebar on the side contains sources to be explored.
- **Highlight & Annotate**: Text on a source can be highlighted and an annotation can be made.
- **Manage Notes & Convert to Node**: Highlighted text can be hovered over and clicked to edit or delete a note, or convert it to a node.
- **AI Agent Hints**: The AI agent can be used for hints when the user is stuck.

### Stage 2: Mind Map (Conceptualise)
- **Sources & Notes**: The sidebar contains the sources. The user can scroll through these and hover or click on highlights to see the notes they made and convert them to concept nodes.
- **Hand Icon (Pan & Select)**: The hand icon can be used to pan around the canvas or select a node.
- **Concept Node Selection (Edit & Delete)**: The tutorial points directly to concept nodes on the canvas, instructing users that they can select a node to edit and delete it (selected nodes glow blue).
- **Circle Icon (Create Node)**: The circle icon can be used to create a node. These are key concepts identified from the text.
- **Line Icon (Link Nodes)**: The line icon can be used to create links between nodes. After selecting the line, select a node and then another node to link it with.
- **Zoom Controls**: The plus and minus allow for zooming in and out.
- **Collapse Sidebar**: The sidebar can be collapsed to maximize canvas space.

### Stage 3: Challenge (Inquire + Evaluate)
- **Chat with AI Agent**: Users can chat with the AI agent to inquire about and evaluate the sources: question assumptions, seek alternative viewpoints, and assess evidence credibility, reliability and validity.
- **Concept Map Reference**: Reference and interact with concept nodes on the canvas while questioning assumptions.
- **Navigation Dock**: Navigate back to earlier stages or proceed when ready.

### Stage 4: Conclude (Synthesise)
- **Final Conclusion Editor**: Users create a final conclusion after reflecting on the process. It is based on their annotations, concept map and understanding of the topic.
- **'Audit' Button**: The 'audit' button lets the AI agent cross check the conclusion to see if there's anything else the user can consider.
- **'Submit' Button**: The 'submit' button lets the user complete the module.

First create an implementation plan and seek approval before continuing. Build the platform in stages.