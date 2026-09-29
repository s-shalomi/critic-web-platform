# Shared Module (`src/shared`)

This folder contains shared system configurations, theme design tokens, database client instances, and utility helpers accessible across all application domains and Next.js routes.

---

## Directory Overview

- **`config/theme.ts`**: Unified brand design system tokens defining typography, primary colors, neon accents, glassmorphism styles, and badge metadata. Used across all stage screens to ensure strict visual consistency without hardcoded hex colors.
- **`db/prisma.ts`**: Shared Prisma Client singleton instance configured to prevent connection pool exhaustion across Next.js API hot-reloads.
- **`utils/storage.ts`**: Student-scoped LocalStorage key isolation utility (`getStudentStorageKey`) ensuring notes, concepts, nodes, chat history, and synthesis drafts remain completely isolated per authenticated student session.

---

## Usage Example

```typescript
import { BRAND_COLORS, TYPOGRAPHY } from '@/shared/config/theme';
import { getStudentStorageKey } from '@/shared/utils/storage';

// Generate student-isolated storage key
const notesKey = getStudentStorageKey('critic_notes', moduleId);
```
