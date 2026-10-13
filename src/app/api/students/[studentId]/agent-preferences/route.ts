import { NextResponse } from 'next/server';
import { agentPreferencesStore, saveStoreToDisk } from '@/shared/db/sessionStore';

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const saved = agentPreferencesStore.get(params.studentId);
    return NextResponse.json({
      success: true,
      preferences: saved || {
        studentId: params.studentId,
        agentPersonality: 'Friendly',
        agentAppearance: 'aria',
        avatarName: 'Aria',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch agent preferences' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const body = await request.json();
    const { agentPersonality, agentAppearance, avatarName } = body;

    const entry = {
      studentId: params.studentId,
      agentPersonality: agentPersonality || 'Friendly',
      agentAppearance: agentAppearance || 'aria',
      avatarName: avatarName || 'Aria',
      updatedAt: new Date().toISOString(),
    };

    agentPreferencesStore.set(params.studentId, entry);
    saveStoreToDisk();

    return NextResponse.json({
      success: true,
      preferences: entry,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update agent preferences' }, { status: 500 });
  }
}
