import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const body = await request.json();
    const { agentPersonality, agentAppearance, avatarName } = body;

    // Preferences updated successfully
    return NextResponse.json({
      success: true,
      preferences: {
        studentId: params.studentId,
        agentPersonality: agentPersonality || 'Socratic Peer',
        agentAppearance: agentAppearance || 'default_cyan',
        avatarName: avatarName || 'Aria',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update agent preferences' }, { status: 500 });
  }
}
