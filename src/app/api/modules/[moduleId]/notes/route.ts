import { NextResponse } from 'next/server';
import { getNotesForModule, createNote } from '@/domains/notes/noteService';

export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const notes = await getNotesForModule(params.moduleId);
    return NextResponse.json({ notes });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const body = await request.json();
    const { sourceId, highlightedText, noteText } = body;

    if (!sourceId || !highlightedText || !noteText) {
      return NextResponse.json({ error: 'Missing required note parameters' }, { status: 400 });
    }

    const note = await createNote({
      moduleId: params.moduleId,
      sourceId,
      highlightedText,
      noteText,
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}
