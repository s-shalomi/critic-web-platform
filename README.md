# CRITIC - Gamified Educational Platform for Teenagers (Ages 17-19)

Welcome to the **CRITIC** codebase. CRITIC is a web-based educational platform that utilizes a gamified interface, Socratic questioning, and AI scaffolding methods to enhance critical thinking skills in teenagers aged 17–19.

---

## Table of Contents

- [Overview](#overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Codebase Structure & Navigation](#codebase-structure--navigation)
- [Domain Model Overview](#domain-model-overview)
- [Getting Started & Development](#getting-started--development)
- [Running Tests](#running-tests)
- [API Contracts](#api-contracts)
- [Socratic AI Engine & Guardrails](#socratic-ai-engine--guardrails)
- [Documentation Index](#documentation-index)

---

## Overview

CRITIC guides students through structured investigative stages for a given topic (currently initial topic: **Climate Change**):
1. **01 Familiarise**: Explore sources, highlight text, capture biases/assumptions, and convert notes to concept nodes.
2. **02 Conceptualise**: Build a visual concept map with drag-and-drop nodes, connectors, and dynamic node growth reflecting link accumulation.
3. **03 Inquire & 04 Evaluate**: Engage in Socratic dialogue with the AI peer (Aria) featuring Socratic hints and Devil's Advocate counter-claims.
4. **05 Synthesise**: Draft a final module synthesis cross-checked against evidence and concept map nodes by the AI agent.
5. **06 Case Debrief / Review**: Receive accurate performance statistics (concepts identified, assumptions challenged, synthesis score), 6 unlocked badges, and an MBTI-like reasoning card exportable as a `.png` image.

---

## Architecture & Tech Stack

- **Framework**: Next.js 14 (App Router, React 18, TypeScript)
- **Styling**: Unified Design Tokens (`src/shared/config/theme.ts`), CSS Modules, and Global Brand CSS (`src/app/globals.css`)
- **Database**: PostgreSQL (Prisma ORM with JSONB support for concept node/link graphs) with student-scoped client LocalStorage fallback for instant offline session persistence
- **AI Integration**: Gemini Free Tier (`@google/generative-ai`) with automatic fallback to Groq (`llama-3.3-70b-versatile`) on rate-limit (429) or error
- **Authentication**: JWT Session Tokens (`jose`) with role-based routing (Student Access Code & Teacher Email/Password)
- **Testing**: Jest with `ts-jest` (`npm test`)

---

## Codebase Structure & Navigation

```text
critic app/
├── prisma/
│   └── schema.prisma         # Database models (12 PostgreSQL models)
├── src/
│   ├── app/                  # Next.js App Router Pages & API Routes
│   │   ├── api/              # API Route Handlers (/api/auth, /api/topics, /api/modules, etc.)
│   │   ├── dashboard/        # Student Topic Selection Screen
│   │   ├── module/[moduleId]/# 5-Stage Investigative Flow (familiarise, conceptualise, inquire, synthesise, review)
│   │   └── teacher/          # Teacher Portal (Access Code Generator, Progress Tracker, Source Manager)
│   ├── domains/              # Domain-Driven Core Logic Services
│   │   ├── ai/               # Socratic AI Engine, Gemini/Groq Fallback & Guardrails
│   │   ├── auth/             # Student & Teacher Authentication & JWT Issuance
│   │   ├── concepts/         # Visual Concept Map Node & Link Management
│   │   ├── notes/            # Evidence Highlighting & Note-to-Node Converter
│   │   ├── review/           # Statistics Calculation & MBTI Personality Card Generator
│   │   ├── teacher/          # Teacher Code Generation & Progress Analytics
│   │   └── topics/           # Dynamic Topic & Source Content Provider
│   └── shared/               # Shared Utilities & Configurations
│       ├── config/           # Central Theme Token Config (Colors, Fonts, Glassmorphism)
│       ├── db/               # Shared Prisma Client Instance
│       └── utils/            # Student LocalStorage Isolation Utility
├── tests/                    # Jest Unit & Integration Test Suites
├── requirements.md           # Single Source of Truth System Requirements
├── PROGRESS.md               # Central Development & QA Progress Log
└── README.md                 # Root Codebase Guide (this file)
```

---

## Domain Model Overview

Each domain in `src/domains/` encapsulates a specific business capability:

- [`src/domains/auth/`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/auth/README.md): Student code & teacher credential auth.
- [`src/domains/topics/`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/topics/README.md): Topic definitions and source document management.
- [`src/domains/notes/`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/notes/README.md): Text highlights, notes, and node conversion.
- [`src/domains/concepts/`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/concepts/README.md): Node positioning, link generation, and graph data.
- [`src/domains/ai/`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/ai/README.md): Socratic prompt engineering, Devil's Advocate mode, fallback retry logic.
- [`src/domains/review/`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/review/README.md): Debrief metrics, badges, and MBTI reasoning profile.
- [`src/domains/teacher/`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/teacher/README.md): Access code management and student progress oversight.
- [`src/shared/`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/shared/README.md): Global tokens and storage helpers.

---

## Getting Started & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Ensure `.env` contains:
   ```env
   GEMINI_API_KEY=your_gemini_key
   GROQ_API_KEY=your_groq_key
   JWT_SECRET=super_secret_jwt_key_2026
   DATABASE_URL=postgresql://user:pass@localhost:5432/critic_db
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Default Test Credentials**:
   - **Student Access Code**: `CLIMATE2026`
   - **Teacher Login**: `teacher@school.edu` / `TeacherPass2026!`

---

## Running Tests

Run the full Jest test suite across all 8 domain modules:
```bash
npm test
```

---

## Socratic AI Engine & Guardrails

The AI agent (**Aria**) adheres strictly to system guardrails:
1. **Never gives factual verdicts**: Responds exclusively with Socratic questioning or counter-perspectives.
2. **Mandatory turn ending**: Every substantive response ends in a question or prompt.
3. **No hallucinated citations**: Directs students back to provided sources or requests supporting evidence.
4. **Mandatory Initial Disclosure**: Every student receives a clear disclosure modal outlining Socratic questioning, Devil's Advocate roleplay, and non-authoritative nature.

---

## Documentation Index

- [Requirements Specification](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/requirements.md)
- [Development & QA Log](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/PROGRESS.md)
- [Auth Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/auth/README.md)
- [Topics Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/topics/README.md)
- [Notes Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/notes/README.md)
- [Concepts Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/concepts/README.md)
- [AI Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/ai/README.md)
- [Review Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/review/README.md)
- [Teacher Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/teacher/README.md)
- [Shared Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/shared/README.md)
- [Tests Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/tests/README.md)
