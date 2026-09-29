/**
 * POST /api/students/progress
 *
 * Called by each student stage page on mount to record the student's current stage
 * into the shared sessionStore so the teacher portal shows live progress.
 *
 * Body: { accessCode, studentId, topicTitle, currentStage, status? }
 */

import { NextResponse } from 'next/server';
import { upsertStudentProgress } from '@/shared/db/sessionStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessCode, studentId, topicTitle, currentStage, status } = body;

    if (!accessCode || !studentId || !currentStage) {
      return NextResponse.json({ error: 'accessCode, studentId and currentStage are required' }, { status: 400 });
    }

    upsertStudentProgress({
      studentId,
      accessCode,
      topicTitle: topicTitle || 'Climate Change',
      currentStage,
      status: status || 'in_progress',
      lastActive: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[students/progress] POST error:', err);
    return NextResponse.json({ error: 'Failed to update student progress' }, { status: 500 });
  }
}
