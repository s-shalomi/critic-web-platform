import { NextResponse } from 'next/server';
import { createConceptLink } from '@/domains/concepts/conceptService';

export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const body = await request.json();
    const { fromNodeId, toNodeId } = body;

    if (!fromNodeId || !toNodeId) {
      return NextResponse.json({ error: 'fromNodeId and toNodeId are required' }, { status: 400 });
    }

    const link = await createConceptLink({
      moduleId: params.moduleId,
      fromNodeId,
      toNodeId,
    });

    if (!link) {
      return NextResponse.json({ error: 'Cannot link node to itself' }, { status: 400 });
    }

    return NextResponse.json({ success: true, link });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}
