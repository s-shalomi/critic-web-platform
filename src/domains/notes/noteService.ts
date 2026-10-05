/**
 * Notes Domain Service
 * Manages evidence text highlights, inline note tooltips on hover, editing, deletion, and conversion to concept nodes.
 */

import { createConceptNode, ConceptNode } from '../concepts/conceptService';
import { notesStore } from '@/shared/db/sessionStore';

export interface Note {
  id: string;
  moduleId: string;
  sourceId: string;
  highlightedText: string;
  noteText: string;
  convertedToNode: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getNotesForModule(moduleId: string): Promise<Note[]> {
  return (notesStore.get(moduleId) as Note[]) || [];
}

export async function createNote(data: {
  moduleId: string;
  sourceId: string;
  highlightedText: string;
  noteText: string;
}): Promise<Note> {
  const note: Note = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    moduleId: data.moduleId,
    sourceId: data.sourceId,
    highlightedText: data.highlightedText,
    noteText: data.noteText,
    convertedToNode: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existing = (notesStore.get(data.moduleId) as Note[]) || [];
  existing.push(note);
  notesStore.set(data.moduleId, existing);

  return note;
}

export async function updateNote(noteId: string, noteText: string): Promise<Note | null> {
  for (const [moduleId, notes] of notesStore.entries()) {
    const note = (notes as Note[]).find((n) => n.id === noteId);
    if (note) {
      note.noteText = noteText;
      note.updatedAt = new Date().toISOString();
      notesStore.set(moduleId, notes);
      return note;
    }
  }
  return null;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  for (const [moduleId, notes] of notesStore.entries()) {
    const index = (notes as Note[]).findIndex((n) => n.id === noteId);
    if (index !== -1) {
      (notes as Note[]).splice(index, 1);
      notesStore.set(moduleId, notes);
      return true;
    }
  }
  return false;
}

export async function convertNoteToNode(noteId: string): Promise<{ success: boolean; conceptNode?: ConceptNode }> {
  for (const [moduleId, notes] of notesStore.entries()) {
    const note = (notes as Note[]).find((n) => n.id === noteId);
    if (note) {
      note.convertedToNode = true;
      note.updatedAt = new Date().toISOString();
      
      // Automatically generate concept node in concept canvas store
      const conceptNode = await createConceptNode({
        moduleId,
        text: note.noteText || note.highlightedText,
        positionX: 200 + Math.random() * 250,
        positionY: 150 + Math.random() * 200,
        sourceNoteId: note.id,
      });

      return { success: true, conceptNode };
    }
  }
  return { success: false };
}

export async function revertNoteConvertedToNode(noteId: string): Promise<boolean> {
  for (const [moduleId, notes] of notesStore.entries()) {
    const note = (notes as Note[]).find((n) => n.id === noteId);
    if (note) {
      note.convertedToNode = false;
      note.updatedAt = new Date().toISOString();
      notesStore.set(moduleId, notes);
      return true;
    }
  }
  return false;
}
