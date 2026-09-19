# Notes Domain Documentation

## Overview
The Notes domain handles student source text highlighting, note taking on assumptions/biases, and converting evidence notes into concept nodes for the conceptualise stage.

## Key Files
- [`noteService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/notes/noteService.ts): Provides note CRUD and node conversion logic.

## API Contracts
- `GET /api/modules/:moduleId/notes`: Fetch all notes for a module.
- `POST /api/modules/:moduleId/notes`: Save a new highlighted text note.
- `DELETE /api/notes/:noteId`: Remove a note.
- `POST /api/notes/:noteId/convert-to-node`: Mark note as converted and generate a concept node on the visual map.
