import { NextResponse } from 'next/server';
import { getSourcesForTopic, addSourceToTopic } from '@/domains/topics/topicService';

export async function GET(
  request: Request,
  { params }: { params: { topicId: string } }
) {
  try {
    const sources = await getSourcesForTopic(params.topicId);
    return NextResponse.json({ sources });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load topic sources' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { topicId: string } }
) {
  try {
    const body = await request.json();
    const { title, authorName, text, type } = body;

    if (!title || !text) {
      return NextResponse.json({ error: 'Title and text are required for source' }, { status: 400 });
    }

    const source = await addSourceToTopic(params.topicId, {
      title,
      authorName,
      text,
      type,
    });

    return NextResponse.json({ success: true, source });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add topic source' }, { status: 500 });
  }
}
