# Next.js App Router Layer (`src/app`)

This directory contains the user interface pages, layout definitions, and API route handlers for the CRITIC web platform.

---

## Folder Map

```text
src/app/
├── api/                             # REST API Endpoint Route Handlers
│   ├── auth/                        # /api/auth/student-login & /api/auth/teacher-login
│   ├── modules/                     # /api/modules/:moduleId/* (notes, conceptualise, inquire, synthesis, review)
│   ├── notes/                       # /api/notes/:noteId (PUT/DELETE & convert-to-node)
│   ├── concepts/                    # /api/concepts/:nodeId & /api/links/:linkId
│   ├── students/                    # /api/students/:studentId/agent-preferences
│   ├── teacher/                     # /api/teachers/access-codes & progress
│   └── topics/                      # /api/topics & /api/topics/:topicId/sources
├── dashboard/                       # Topic selection dashboard screen
├── module/[moduleId]/               # 5-Stage Gamified Learning Flow
│   ├── familiarise/                 # Stage 01: Evidence gathering & highlighting
│   ├── conceptualise/               # Stage 02: Visual concept map canvas
│   ├── inquire/                     # Stage 03 & 04: Socratic inquiry & evaluation chatbot
│   ├── synthesise/                  # Stage 05: Module synthesis cross-checker
│   └── review/                      # Stage 06: Case debrief & MBTI reasoning card
├── teacher/                         # Teacher management portal dashboard
├── globals.css                      # Central CSS variables & theme overrides
├── layout.tsx                       # Root HTML/CSS layout wrapper
└── page.tsx                         # Landing Page (Access code & Teacher login)
```

---

## Key Features & User Interactions

- **Responsive Viewport Design**: Portable across mobile, tablet, and desktop display viewports.
- **Immediate Visual Feedback**: Instant loading indicators during AI turn generation, toast notification banners for note conversions, and animated concept map node interactions.
- **Stage Progression Flow**: Seamless navigation between stages with non-blocking AI contextual nudges guiding students to complete evidence collection prior to inquiry/synthesis.
