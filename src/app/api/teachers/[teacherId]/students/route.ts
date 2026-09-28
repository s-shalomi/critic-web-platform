import { NextResponse } from 'next/server';
import { getStudentsProgressForTeacher, getAccessCodesForTeacher } from '@/domains/teacher/teacherService';

export async function GET(
  request: Request,
  { params }: { params: { teacherId: string } }
) {
  try {
    const students = await getStudentsProgressForTeacher(params.teacherId);
    const accessCodes = await getAccessCodesForTeacher(params.teacherId);
    return NextResponse.json({ success: true, students, accessCodes });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch teacher student data' }, { status: 500 });
  }
}
