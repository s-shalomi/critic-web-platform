import { NextResponse } from 'next/server';
import { generateModuleReview } from '@/domains/review/reviewService';

export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const reviewData = await generateModuleReview(params.moduleId);
    return NextResponse.json({ success: true, review: reviewData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch review stats' }, { status: 500 });
  }
}
