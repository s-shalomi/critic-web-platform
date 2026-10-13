# Shared Module (`src/shared`)

This folder contains shared system configurations, theme design tokens, database client instances, and utility helpers accessible across all application domains and Next.js routes.

---

## Directory Overview

- **`components/TooltipTutorial/`**: Reusable interactive step-by-step onboarding tutorial tour component with animated spotlight target highlighting ring, directional arrow pointer, progress counter, keyboard navigation, and Next/Back/Skip controls.
- **`components/StageOverviewModal/`**: Accessible educational stage overview modal triggered by the '?' button explaining why each stage matters and providing actionable checklists.
- **`config/theme.ts`**: Unified brand design system tokens defining typography, primary colors, neon accents, glassmorphism styles, and badge metadata. Used across all stage screens to ensure strict visual consistency without hardcoded hex colors.
- **`config/tutorials.ts`**: Stage tutorial configurations (`STAGE_TUTORIAL_STEPS`) containing concise, targeted walkthrough steps for all 4 stages. Only the Annotate stage mentions the dock and '?' button.
- **`config/stageOverviews.ts`**: Stage educational overview descriptions and checklist data (`STAGE_OVERVIEWS`) for the '?' button modal.
- **`db/prisma.ts`**: Shared Prisma Client singleton instance configured to prevent connection pool exhaustion across Next.js API hot-reloads.
- **`utils/storage.ts`**: Student-scoped LocalStorage key isolation utility (`getStudentStorageKey`, `hasSeenStageTutorial`, `markStageTutorialSeen`, `resetStageTutorial`) ensuring notes, concepts, nodes, chat history, synthesis drafts, and tutorial flags remain completely isolated per authenticated student session.

---

## Usage Example

```typescript
import { BRAND_COLORS, TYPOGRAPHY } from '@/shared/config/theme';
import { STAGE_TUTORIAL_STEPS } from '@/shared/config/tutorials';
import { TooltipTutorial } from '@/shared/components/TooltipTutorial/TooltipTutorial';
import { getStudentStorageKey, hasSeenStageTutorial } from '@/shared/utils/storage';

// Check if student has seen the stage tutorial
const hasSeen = hasSeenStageTutorial(moduleId, 'familiarise');
```
