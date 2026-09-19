import { NextResponse } from 'next/server';
import { getAllTopics } from '@/domains/topics/topicService';

export async function GET() {
  try {
    const topics = await getAllTopics();
    return NextResponse.json({ topics });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 });
  }
}
