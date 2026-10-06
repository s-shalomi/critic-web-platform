import { NextResponse } from 'next/server';
import { updateNote, deleteNote } from '@/domains/notes/noteService';

export async function PUT(
  request: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { noteText, moduleId, sourceId, highlightedText } = body;

    if (noteText === undefined || noteText === null) {
      return NextResponse.json({ error: 'noteText is required' }, { status: 400 });
    }

    const updated = await updateNote(params.noteId, noteText, {
      moduleId,
      sourceId,
      highlightedText,
    });

    return NextResponse.json({ success: true, note: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    const deleted = await deleteNote(params.noteId);
    if (!deleted) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
