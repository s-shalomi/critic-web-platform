# CRITIC - Feature Branch: Iteration 1 (Foundation & Core Workflow)

> **Branch**: `feature/iteration-1`  
> **Release Target**: Iteration 1 Milestone  
> **Status**: Completed & Verified

Welcome to the **Iteration 1** branch of **CRITIC**, a web-based educational platform that uses gamified multi-stage scaffolding and Socratic AI questioning to enhance critical thinking skills in high school teenagers (ages 17–19).

---

## Iteration 1 Overview & Core Deliverables

This branch delivers the foundational end-to-end architecture and functional implementation of the platform described in [`requirements.md`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/requirements.md):

1. **Next.js 14 Modular Monolith Foundation**:
   - Organized into clean, isolated domain boundaries (`src/domains/auth`, `topics`, `notes`, `concepts`, `ai`, `review`, `teacher`).
   - Unified design token configuration in `src/shared/config/theme.ts` adhering to WCAG standards.
   - Comprehensive Prisma PostgreSQL schema (`prisma/schema.prisma`) with 12 models.
   - Cross-reload singleton session store (`.critic_session_store.json`) for zero-configuration local prototyping.

2. **5-Stage Guided Investigative Workflow**:
   - **01 Familiarise**: Read topic sources (Climate Change), highlight claims, take analytical notes, and convert notes into concept nodes.
   - **02 Conceptualise**: Interactive concept map canvas with drag-and-drop nodes, connectors, zoom/pan, and dynamic node growth based on link density.
   - **03 Inquire & 04 Evaluate**: Real-time Socratic dialogue with the AI peer (Aria), supporting Socratic hints and Devil's Advocate counter-perspectives without hallucinated facts.
   - **05 Synthesise**: Draft final conclusions with AI reasoning cross-checks against prior evidence notes and concept nodes.
   - **06 Case Debrief / Review**: Performance analytics (concepts identified, assumptions challenged, synthesis score), 6 unlocked achievement badges, and an MBTI-style reasoning profile card exportable as `.png`.

3. **High-Performance Socratic AI Engine**:
   - Ultra-fast Socratic dialogue engine with guaranteed sub-3-second latency.
   - Transitioned to Groq (`openai/gpt-oss-120b` and `llama-3.3-70b-versatile`) with institutional proxy SSL handling (detailed in [`justifications.md`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/justifications.md)).
   - Mandatory non-authoritative disclosure presented on initial module entry.

4. **Teacher Portal**:
   - Dedicated authentication separate from student access codes (`/teacher`).
   - Dynamic student access code generator with optional expiration.
   - Real-time student progress tracking table.
   - In-app topic source management (add, edit, remove sources with instant reflection across student modules).

---

## Prerequisites

- **Node.js**: `v18.17.0` or higher (`v20.x` LTS recommended)
- **npm**: `v9.x` or higher
- **Git**

---

## How to Run the App on This Branch

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# AI Service API Keys (At least one key is recommended for live AI chat)
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Authentication Secret
JWT_SECRET=super_secret_jwt_key_2026

# Optional: PostgreSQL Database URL (Uncomment if using a live PostgreSQL instance)
# DATABASE_URL="postgresql://user:password@localhost:5432/critic_db?schema=public"
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build & Start
```bash
npm run build
npm start
```

---

## How to Use the App

### Student Workflow
1. **Access Code Login**: On the landing page (`/`), enter demo access code `CLIMATE2026` or `STUDENT123` and click **Enter Critic**.
2. **Topic Selection**: Select the active **Climate Change** topic on `/dashboard`.
3. **Stage 1 (Annotate)**: Read through sources, select text to create highlights, annotate biases or assumptions, and click **+ Convert to node**.
4. **Stage 2 (Mind Map)**: Connect concept nodes on the canvas, add new concepts, and arrange argument webs.
5. **Stage 3 (Challenge)**: Chat with Aria to stress-test your thinking, challenge assumptions, and evaluate opposing views.
6. **Stage 4 (Conclude)**: Draft your conclusion and click **Audit with Aria** to verify evidence coverage.
7. **Stage 5 (Review)**: Review your critical thinking statistics, unlock badges, and download your MBTI reasoning card.

### Teacher Workflow
1. From the top navigation bar, click **Login** and switch to **Teacher Login**.
2. Sign in with demo credentials:
   - **Email**: `teacher@school.edu`
   - **Password**: `TeacherPass2026!`
3. Generate new access codes, monitor student stage progression live, or add/edit topic sources in real-time.

---

## Default Demo Credentials

| Role | Access Code / Credentials | Permissions |
| :--- | :--- | :--- |
| **Student** | `CLIMATE2026` or `STUDENT123` | Full 5-stage student investigative flow |
| **Teacher** | `teacher@school.edu` / `TeacherPass2026!` | Code generation, live progress monitor, source editing |

---

## Running Automated Tests

Run the full Jest test suite for Iteration 1:
```bash
npm test
```
All **8 test suites** (31 tests) pass across auth, topics, notes, concepts, ai, review, teacher, and synthesis.

---

## Documentation Index

- [Master Requirements Specification](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/requirements.md)
- [Development Progress Log](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/PROGRESS.md)
- [Iteration 1 Architectural Justifications](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/justifications.md)
- [Auth Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/auth/README.md)
- [Topics Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/topics/README.md)
- [Notes Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/notes/README.md)
- [Concepts Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/concepts/README.md)
- [AI Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/ai/README.md)
- [Review Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/review/README.md)
- [Teacher Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/teacher/README.md)
- [Shared Domain Documentation](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/shared/README.md)
