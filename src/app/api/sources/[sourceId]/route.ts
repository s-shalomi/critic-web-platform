import { NextResponse } from 'next/server';
import { updateSourceInTopic, deleteSourceFromTopic, getSourceById } from '@/domains/topics/topicService';

/**
 * GET /api/sources/:sourceId
 * Retrieve a specific source
 */
export async function GET(
  request: Request,
  { params }: { params: { sourceId: string } }
) {
  try {
    const source = await getSourceById(params.sourceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, source });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve source' }, { status: 500 });
  }
}

/**
 * PUT /api/sources/:sourceId
 * Update an existing source (Teacher only)
 */
export async function PUT(
  request: Request,
  { params }: { params: { sourceId: string } }
) {
  try {
    const body = await request.json();
    const { title, authorName, text, type } = body;

    const updatedSource = await updateSourceInTopic(params.sourceId, {
      title,
      authorName,
      text,
      type,
    });

    if (!updatedSource) {
      return NextResponse.json({ error: 'Source not found to update' }, { status: 404 });
    }

    return NextResponse.json({ success: true, source: updatedSource });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
  }
}

/**
 * DELETE /api/sources/:sourceId
 * Remove a source from its topic (Teacher only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { sourceId: string } }
) {
  try {
    const deleted = await deleteSourceFromTopic(params.sourceId);
    if (!deleted) {
      return NextResponse.json({ error: 'Source not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Source deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
