import { NextResponse } from 'next/server';
import { deleteConceptLink } from '@/domains/concepts/conceptService';

export async function DELETE(
  request: Request,
  { params }: { params: { linkId: string } }
) {
  try {
    const deleted = await deleteConceptLink(params.linkId);
    if (!deleted) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
