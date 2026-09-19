import { NextResponse } from 'next/server';
import { getSourcesForTopic } from '@/domains/topics/topicService';

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
