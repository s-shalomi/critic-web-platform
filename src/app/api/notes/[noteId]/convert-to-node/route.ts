import { NextResponse } from 'next/server';
import { convertNoteToNode } from '@/domains/notes/noteService';

export async function POST(
  request: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    const result = await convertNoteToNode(params.noteId);
    if (!result.success) {
      return NextResponse.json({ error: 'Note not found or already converted' }, { status: 404 });
    }
    return NextResponse.json({ success: true, conceptNode: result.conceptNode });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to convert note to concept node' }, { status: 500 });
  }
}
