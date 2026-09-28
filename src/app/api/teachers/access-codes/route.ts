import { NextResponse } from 'next/server';
import { generateAccessCode } from '@/domains/teacher/teacherService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacherId, customCode } = body;

    const accessCode = await generateAccessCode(teacherId || 'teacher-demo', customCode);
    return NextResponse.json({ success: true, accessCode });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate access code' }, { status: 500 });
  }
}
