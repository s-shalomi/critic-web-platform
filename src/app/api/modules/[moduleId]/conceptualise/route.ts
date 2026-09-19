import { NextResponse } from 'next/server';
import { getConceptualiseData } from '@/domains/concepts/conceptService';

export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const data = await getConceptualiseData(params.moduleId);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch conceptualise stage data' }, { status: 500 });
  }
}
