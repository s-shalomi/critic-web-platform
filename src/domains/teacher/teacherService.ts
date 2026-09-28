/**
 * Teacher Domain Service
 * Manages student access code generation, student progress monitoring across topics, and topic source CRUD.
 */

export interface StudentProgress {
  studentId: string;
  accessCode: string;
  topicTitle: string;
  currentStage: string;
  status: string;
  lastActive: string;
}

export interface GeneratedCode {
  id: string;
  code: string;
  teacherId: string;
  createdAt: string;
  expiresAt?: string;
}

const memoryAccessCodes: GeneratedCode[] = [
  { id: 'code-1', code: 'CLIMATE2026', teacherId: 'teacher-demo', createdAt: new Date().toISOString() },
  { id: 'code-2', code: 'STUDENT123', teacherId: 'teacher-demo', createdAt: new Date().toISOString() },
];

const memoryStudentProgress: StudentProgress[] = [
  {
    studentId: 'student_climate2026',
    accessCode: 'CLIMATE2026',
    topicTitle: 'Climate Change',
    currentStage: 'synthesise',
    status: 'in_progress',
    lastActive: new Date().toISOString(),
  },
  {
    studentId: 'student_student123',
    accessCode: 'STUDENT123',
    topicTitle: 'Climate Change',
    currentStage: 'conceptualise',
    status: 'in_progress',
    lastActive: new Date().toISOString(),
  },
];

export async function generateAccessCode(teacherId: string, customCode?: string): Promise<GeneratedCode> {
  const codeString = customCode ? customCode.trim().toUpperCase() : `STUDENT_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const accessCode: GeneratedCode = {
    id: `code_${Date.now()}`,
    code: codeString,
    teacherId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
  };

  memoryAccessCodes.push(accessCode);
  return accessCode;
}

export async function getAccessCodesForTeacher(teacherId: string): Promise<GeneratedCode[]> {
  return memoryAccessCodes.filter((c) => c.teacherId === teacherId || teacherId === 'teacher-demo');
}

export async function getStudentsProgressForTeacher(teacherId: string): Promise<StudentProgress[]> {
  return memoryStudentProgress;
}
