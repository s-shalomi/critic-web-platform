import { NextResponse } from 'next/server';

const SOCRATIC_HINTS: Record<string, string[]> = {
  familiarise: [
    'What underlying assumptions might the author be making in this claim?',
    'What evidence would change your mind about the statement you just read?',
    'How might someone with a different background interpret this source?',
    'Is this statement describing a short-term weather observation or a long-term climate trend?',
  ],
  conceptualise: [
    'How does this concept connect to the evidence you highlighted earlier?',
    'What cause-and-effect relationship exists between these two nodes?',
    'Is there a missing intermediate concept between these links?',
  ],
};

export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const stage = body.stage || 'familiarise';

    const hints = SOCRATIC_HINTS[stage] || SOCRATIC_HINTS.familiarise;
    const randomHint = hints[Math.floor(Math.random() * hints.length)];

    return NextResponse.json({
      success: true,
      hint: randomHint,
      agentName: 'Aria',
      personality: 'Socratic Peer',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate agent hint' }, { status: 500 });
  }
}
