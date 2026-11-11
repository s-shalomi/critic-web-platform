# CRITIC - Gamified Educational Platform for Teenagers (Ages 17–19)

Welcome to **CRITIC**, a web-based educational platform designed to cultivate and sharpen critical thinking skills in high school teenagers (ages 17–19). By pairing a gamified multi-stage investigation workflow with Socratic questioning and pedagogical AI scaffolding, CRITIC empowers students to identify bias, question unstated assumptions, detect logical fallacies, and synthesize well-reasoned conclusions on complex modern topics.

---

## Table of Contents

- [Overview & Key Features](#overview--key-features)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Prerequisites](#prerequisites)
- [Quick Start: How to Run the App](#quick-start-how-to-run-the-app)
- [Environment Configuration](#environment-configuration)
- [How to Use the App](#how-to-use-the-app)
  - [Student Journey (Step-by-Step)](#student-journey-step-by-step)
  - [Teacher Portal & Classroom Management](#teacher-portal--classroom-management)
  - [Demo Accounts & Test Credentials](#demo-accounts--test-credentials)
- [Core Interactivity & UX Highlights](#core-interactivity--ux-highlights)
- [Project Structure](#project-structure)
- [Running Automated Tests & Verification](#running-automated-tests--verification)
- [Socratic AI Engine & Guardrails](#socratic-ai-engine--guardrails)
- [Documentation Index](#documentation-index)

---

## Overview & Key Features

Modern teenagers are inundated with misinformation across social media, algorithmic feeds, and generated content. CRITIC offers a structured workspace to slow down and rigorously evaluate claims:

- **Anonymous, Student-Isolated Access**: Zero personal data collected; students authenticate with unique access codes and receive isolated progress and storage sandboxes.
- **5-Stage Guided Investigation Flow**:
  1. **Stage 01: Annotate (`familiarise`)**: Highlight claim text, take analytical notes, identify rhetorical techniques and biases, and convert notes into concept nodes.
  2. **Stage 02: Mind Map (`conceptualise`)**: Interactive drag-and-drop node canvas with bidirectional link generation, zoom/pan navigation, and dynamic node growth as connections accumulate.
  3. **Stage 03: Challenge (`inquire`)**: Real-time Socratic dialogue with an AI peer that questions assumptions and offers Devil's Advocate counter-perspectives without hallucinating facts.
  4. **Stage 04: Conclude (`synthesise`)**: Draft final reasoned conclusions with manual and auto-save capabilities, plus an AI Reasoning Audit cross-checking prior evidence.
  5. **Stage 05: Case Debrief (`review`)**: Gamified debrief summarizing concepts identified, assumptions challenged, inquiry depth, unlocked achievement badges, and an MBTI-style critical thinker profile card exportable as a `.png`.
- **Customizable AI Companion**: Choose between avatars and tones (Friendly, Mentor, Witty Challenger, Curious Explorer, Devil's Advocate).
- **Teacher Control Center**: Generate student access codes, inspect live classroom progress, and dynamically add or edit topic sources with zero downtime.

---

## Tech Stack & Architecture

- **Frontend & Backend**: Next.js 14 (App Router, React 18, TypeScript)
- **Styling**: Unified Design Tokens (`src/shared/config/theme.ts`), Vanilla CSS Modules, and Cyber-Academic Dark Glassmorphism (`src/app/globals.css`)
- **Database & Persistence**:
  - PostgreSQL with Prisma ORM (`prisma/schema.prisma`) for production deployments
  - Thread-safe, cross-reload Singleton Session Store (`.critic_session_store.json`) with student-scoped client LocalStorage for instant zero-configuration local prototyping
- **AI Scaffolding**: Dual-provider Socratic engine utilizing Google Gemini (`@google/generative-ai`) with automatic rate-limit and error fallback to Groq (`groq-sdk`, Llama 3.3 70B)
- **Authentication**: Stateless JWT session tokens (`jose`) with role-based routing (Student vs. Teacher)
- **Testing**: Jest with `ts-jest` for comprehensive unit and integration coverage across all domain modules

---

## Prerequisites

Before running the application locally, ensure you have installed:

- **Node.js**: `v18.17.0` or higher (Node `v20.x` LTS recommended)
- **npm**: `v9.x` or higher
- **Git**: Installed and configured on your machine
- *(Optional)* **PostgreSQL**: Required only if connecting to a real database; the application includes a full in-memory/JSON fallback store for out-of-the-box local operation.

---

## Quick Start: How to Run the App

### 1. Clone the Repository
```bash
git clone git@github.com:s-shalomi/critic-web-platform.git
cd "critic app"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# AI Providers (At least one key is recommended for live AI chat)
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# JWT Authentication
JWT_SECRET=critic_super_secret_jwt_key_2026_change_in_production

# Optional: PostgreSQL Database (Uncomment if using a live PostgreSQL instance)
# DATABASE_URL="postgresql://user:password@localhost:5432/critic_db?schema=public"
```
> **Note**: If neither `GEMINI_API_KEY` nor `GROQ_API_KEY` is provided, the AI service falls back to pre-programmed Socratic fallback heuristics, allowing complete UI and stage progression testing without API keys.

### 4. Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

### 5. Production Build & Start (Optional)
To build and run the production-optimized application:
```bash
npm run build
npm start
```

---

## How to Use the App

### Student Journey (Step-by-Step)

#### 1. Authentication
- On the landing page (`/`), enter a student access code (e.g. `CLIMATE2026` or `STUDENT123`) into the access code field and click **Enter Critic**.
- Or, click **Login** in the top navigation bar to open the student login modal (`/login`).

#### 2. Student Dashboard & Customization (`/dashboard`)
- **Select Topic**: Click on the active topic card (**Climate Change**). *(Other topics like Vaccine Safety and Mental Wellbeing are marked as Coming Soon).*
- **Customize Your AI Companion**:
  - Click **Customise Agent** in the header.
  - Choose an avatar persona (e.g., *Aria*, *Cipher*, *Orion*).
  - Select an interaction tone:
    - **Friendly**: Encouraging and warm with light humor.
    - **Mentor**: Probing questions encouraging deep self-discovery.
    - **Witty Challenger**: Sharp, playful provocations.
    - **Curious Explorer**: Inquisitive and supportive.
    - **Devil's Advocate**: Pushes opposing perspectives and challenges convictions.

#### 3. Stage 01: Annotate (`/module/[moduleId]/familiarise`)
- Read through topic sources in the left reading pane (tweets, research articles, reports).
- Highlight text snippets to trigger the annotation popover:
  - Type your analytical note (e.g., identifying biases, unproven assertions, or rhetorical tricks).
  - Click **Save Note**.
- Convert your note into a concept node by clicking **+ Convert to node**.

#### 4. Stage 02: Mind Map (`/module/[moduleId]/conceptualise`)
- View your visual concept web on the interactive canvas.
- Click **+ Add Concept** to create custom nodes, or inspect the collapsible left Sources pane.
- Hover or click on any highlighted note in the Sources pane to reveal its note text and click **+ Convert to node** to instantly add it to your canvas. Deleting a node immediately reverts the button back.
- Click and drag between node anchor points to draw relationship links.
- Nodes dynamically enlarge as they accumulate connections, highlighting central ideas.
- Use zoom, pan, and center controls to navigate large argument graphs.

#### 5. Stage 03: Challenge (`/module/[moduleId]/inquire`)
- Enter the Socratic dialogue room with your configured AI peer.
- Share your viewpoints, evaluate evidence reliability, or discuss potential counter-arguments.
- The AI peer will ask probing questions, highlight unstated assumptions, and challenge logical leaps without giving authoritative factual verdicts.
- **Socratic Milestone Nudges**: At milestones of 10 Socratic interactions (10, 20, 30...), an unobtrusive notification banner appears suggesting moving forward to the next stage or source, while reassuring you that you can return to refine your work at any time.

#### 6. Stage 04: Conclude (`/module/[moduleId]/synthesise`)
- Write your final synthesized position in the conclusion textarea.
- Click **Save** at any time to persist your draft locally and to the server without triggering an AI check.
- Click **Audit with Aria** to request an AI reasoning audit: the agent verifies whether your conclusion is backed up by your notes and concept map.
- When ready, click **Submit Module** to finalize your investigation.

#### 7. Stage 05: Review & Debrief (`/module/[moduleId]/review`)
- Review your comprehensive investigative metrics:
  - Concepts Identified
  - Assumptions Challenged
  - Socratic Questions Asked
  - Evidence & Misinformation Evaluations
- Unlock achievement badges for your investigative milestones.
- View your customized MBTI-style **Critical Thinking Profile** (e.g., *The Rigorous Architect*, *The Empathetic Inquirer*).
- Click **Download Profile Card** to export your reasoning card as a high-resolution `.png` image.

---

### Teacher Portal & Classroom Management

#### Accessing Teacher Mode
1. From the landing page, click **Login** in the top navigation bar.
2. Select **Teacher Login** and sign in with demo credentials:
   - **Email**: `teacher@school.edu`
   - **Password**: `TeacherPass2026!`
3. You will be redirected to the **Teacher Portal** (`/teacher`).

#### Teacher Capabilities
- **Access Code Generator**: Create individual or batch access codes for student distribution with custom expiration dates.
- **Live Student Progress Tracker**: View a real-time monitor displaying active student codes, their current stage (`familiarise`, `conceptualise`, `inquire`, `synthesise`, or `completed`), and timestamp of last activity.
- **Dynamic Topic & Source Management**:
  - Add new primary sources, articles, or social media excerpts to existing topics.
  - Edit author names, titles, and text contents.
  - Delete outdated sources.
  - Changes propagate instantaneously to student modules upon stage reload.

---

### Demo Accounts & Test Credentials

| Role | Access / Credentials | Purpose |
| :--- | :--- | :--- |
| **Student** | Access Code: `CLIMATE2026` or `STUDENT123` | Full student investigation workflow on Climate Change |
| **Teacher** | `teacher@school.edu` / `TeacherPass2026!` | Access code generation, live progress monitor, source editing |

---

## Core Interactivity & UX Highlights

- **Stage Departure Saved Indicator**: Whenever a student navigates between stages via the bottom dock, an animated emerald notification (`✓ Saved`) displays prominently upon stage departure, assuring students their work is safely persisted.
- **New Access Code Isolation**: Every new access code strictly starts on **Stage 01: Annotate** (`familiarise`). Cross-account and legacy session stage leakage is automatically purged on login.
- **Non-Blocking Socratic Nudges**: Contextual AI nudges encourage evidence gathering and milestone progression without blocking student autonomy.
- **Responsive & Accessible**: Fully compliant with WCAG 2.1 AA standards with high-contrast text, keyboard navigability, clear focus rings, and responsive layouts across desktop and mobile screens.

---

## Project Structure

```text
critic app/
├── prisma/
│   └── schema.prisma                # PostgreSQL models for users, modules, notes, and topics
├── public/                          # Static assets and icons
├── src/
│   ├── app/                         # Next.js App Router (Pages, Layouts, API Routes)
│   │   ├── api/                     # Backend API handlers
│   │   │   ├── auth/                # Student code & teacher credential routes
│   │   │   ├── modules/             # Notes, concepts, inquire messages, and synthesis routes
│   │   │   ├── students/            # Progress ping and agent preference routes
│   │   │   ├── teachers/            # Access code generation routes
│   │   │   └── topics/              # Topic list and source CRUD routes
│   │   ├── dashboard/               # Topic selection and agent customization screen
│   │   ├── login/                   # Student access code login modal screen
│   │   ├── module/[moduleId]/       # 5-Stage module workflow
│   │   │   ├── familiarise/         # Stage 01: Source reading and text annotation
│   │   │   ├── conceptualise/       # Stage 02: Visual concept map canvas
│   │   │   ├── inquire/             # Stage 03: Socratic AI dialogue room
│   │   │   ├── synthesise/          # Stage 04: Conclusion drafting & Save/Audit
│   │   │   └── review/              # Stage 05: Case debrief & MBTI profile card
│   │   ├── teacher/                 # Teacher portal screen
│   │   ├── globals.css              # Global styles, variables, and typography
│   │   ├── layout.tsx               # Root application layout
│   │   └── page.tsx                 # Public landing page with access code input
│   ├── domains/                     # Domain-Driven Core Logic Services
│   │   ├── ai/                      # Socratic AI Engine, Gemini/Groq fallback, prompt templates
│   │   ├── auth/                    # JWT signing, validation, access code auth
│   │   ├── concepts/                # Concept nodes and connection link services
│   │   ├── notes/                   # Text highlighting and note persistence
│   │   ├── review/                  # Investigative stats calculation and MBTI summary
│   │   ├── teacher/                 # Code generation and progress analytics
│   │   └── topics/                  # Dynamic topic registry and source resolver
│   └── shared/                      # Shared reusable UI components and utilities
│       ├── components/              # ConceptMapCanvas, StageNavigationDock, RobotAvatar, etc.
│       ├── config/                  # Theme tokens, tutorial configs, and stage overviews
│       ├── db/                      # Singleton session store and Prisma instance
│       └── utils/                   # Student storage scoping and progress reporting
├── tests/                           # Jest test suites covering all domains and features
├── requirements.md                  # Master specification & single source of truth
├── PROGRESS.md                      # Comprehensive development log and change history
└── README.md                        # Root guide and instructions (this file)
```

---

## Running Automated Tests & Verification

CRITIC includes an extensive suite of automated tests verifying auth, topics, notes, concept canvas, AI fallbacks, teacher portal, review calculations, and stage progression:

### Run the Full Jest Test Suite
```bash
npm test
```
All **11 test suites** and **68+ test cases** pass cleanly with zero mock leaks.

### Run TypeScript Compilation Check
```bash
npx tsc --noEmit
```
Verifies strict TypeScript type safety across the entire codebase with zero errors.

---

## Socratic AI Engine & Guardrails

The AI agent (**Aria**) operates under strict pedagogical guardrails defined in `requirements.md`:

1. **No Authoritative Verdicts**: The agent never declares a student's answer as definitively "correct" or "wrong". Instead, it highlights inconsistencies, asks for supporting evidence, or introduces alternative viewpoints.
2. **Mandatory Question Ending**: Substantive agent responses always end with an open-ended question or prompt to keep the investigative agency with the student.
3. **Evidence-Bound Reasoning**: The agent will not fabricate facts or citations. It repeatedly encourages students to verify claims against the provided sources.
4. **Mandatory First-Entry Disclosure**: Before any AI interaction, students receive an explicit disclosure explaining that the AI acts as a peer playing Devil's Advocate and that its statements must be critically evaluated.

---

## Documentation Index

- **[Master Requirements Specification](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/requirements.md)**: The single source of truth for all domain requirements and acceptance criteria.
- **[Central Development Log](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/PROGRESS.md)**: Detailed history of all feature implementations, bug fixes, and test outcomes.
- **Domain Guides**:
  - [Auth Domain](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/auth/README.md)
  - [Topics Domain](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/topics/README.md)
  - [Notes Domain](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/notes/README.md)
  - [Concepts Domain](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/concepts/README.md)
  - [AI Socratic Domain](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/ai/README.md)
  - [Review & MBTI Domain](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/review/README.md)
  - [Teacher Domain](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/teacher/README.md)
  - [Shared Components & Utilities](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/shared/README.md)
  - [Test Suite Overview](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/README.md)

---

Developed for the Critical Thinking in Teenagers Educational Research Project (2026).
