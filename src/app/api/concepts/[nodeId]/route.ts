import { NextResponse } from 'next/server';
import { updateConceptNode, deleteConceptNode } from '@/domains/concepts/conceptService';

export async function PUT(
  request: Request,
  { params }: { params: { nodeId: string } }
) {
  try {
    const body = await request.json();
    const { text, positionX, positionY } = body;

    const node = await updateConceptNode(params.nodeId, { text, positionX, positionY });
    if (!node) {
      return NextResponse.json({ error: 'Concept node not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, node });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update concept node' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { nodeId: string } }
) {
  try {
    const deleted = await deleteConceptNode(params.nodeId);
    if (!deleted) {
      return NextResponse.json({ error: 'Concept node not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete concept node' }, { status: 500 });
  }
}
