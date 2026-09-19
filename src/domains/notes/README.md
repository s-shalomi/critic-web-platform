# Notes Domain Documentation

## Overview
The Notes domain handles student source text highlighting, inline note tooltips on hover, editing notes, deleting notes, and converting evidence notes into concept nodes for the conceptualise stage.

## Hover & Inline Text Highlighting
- Notes are **not** stored in a static right-hand sidebar.
- Instead, when a student highlights text and saves a note, the exact text snippet in the document body is colored with a neon highlight.
- Hovering over any highlighted text snippet displays an interactive inline tooltip containing:
  - The note content.
  - An **Edit** action (allowing inline text modification).
  - A **Delete** action (removes the note and un-highlights text).
  - A **+ Convert to node** action (transfers evidence to the visual concept map).

## Key Files
- [`noteService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/notes/noteService.ts): Provides note CRUD (create, read, update, delete) and node conversion.

## API Contracts
- `GET /api/modules/:moduleId/notes`: Fetch all notes for a module.
- `POST /api/modules/:moduleId/notes`: Save a new highlighted text note.
- `PUT /api/notes/:noteId`: Edit note text.
- `DELETE /api/notes/:noteId`: Delete note and remove highlight.
- `POST /api/notes/:noteId/convert-to-node`: Mark note as converted and generate a concept node on the visual map.
