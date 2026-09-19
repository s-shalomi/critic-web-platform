import { NextResponse } from 'next/server';
import { createConceptNode } from '@/domains/concepts/conceptService';

export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const body = await request.json();
    const { text, positionX, positionY, sourceNoteId } = body;

    if (!text || positionX === undefined || positionY === undefined) {
      return NextResponse.json({ error: 'Missing required node parameters' }, { status: 400 });
    }

    const node = await createConceptNode({
      moduleId: params.moduleId,
      text,
      positionX,
      positionY,
      sourceNoteId,
    });

    return NextResponse.json({ success: true, node });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create concept node' }, { status: 500 });
  }
}
