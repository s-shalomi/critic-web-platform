# Teacher Domain Documentation

## Overview
The Teacher domain manages teacher-authenticated features including student access code generation, progress tracking, and source management for any topic module.

## Key Files
- [`teacherService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/teacher/teacherService.ts): Generates valid access codes and tracks student progress.

## API Contracts
- `GET /api/teachers/:teacherId/students`: Returns list of students and their stage progress.
- `POST /api/teachers/access-codes`: Generates a new access code for onboarding students.
- `POST /api/topics/:topicId/sources`: Adds a new source to a topic.
- `PUT / DELETE /api/sources/:sourceId`: Edits or deletes a topic source.
