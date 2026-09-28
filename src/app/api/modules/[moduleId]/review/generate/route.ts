import { NextResponse } from 'next/server';
import { generateModuleReview } from '@/domains/review/reviewService';

export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const reviewData = await generateModuleReview(params.moduleId, body);
    return NextResponse.json({ success: true, review: reviewData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate review stats' }, { status: 500 });
  }
}
