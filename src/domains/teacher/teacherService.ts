/**
 * Teacher Domain Service
 * Manages student access code generation, student progress monitoring across topics, and topic source CRUD.
 * Student progress is read from the shared sessionStore singleton so it reflects live student activity.
 */

import {
  accessCodeStore,
  studentProgressStore,
  saveStoreToDisk,
  AccessCodeEntry,
  StudentProgressEntry,
} from '@/shared/db/sessionStore';

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

export async function generateAccessCode(teacherId: string, customCode?: string): Promise<GeneratedCode> {
  const codeString = customCode
    ? customCode.trim().toUpperCase()
    : `STUDENT_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const accessCode: AccessCodeEntry = {
    id: `code_${Date.now()}`,
    code: codeString,
    teacherId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  accessCodeStore.set(codeString, accessCode);
  saveStoreToDisk();
  return accessCode;
}

export async function getAccessCodesForTeacher(teacherId: string): Promise<GeneratedCode[]> {
  return Array.from(accessCodeStore.values()).filter(
    (c) => c.teacherId === teacherId || teacherId === 'teacher-demo'
  );
}

/**
 * Returns live student progress from the shared session store.
 * Entries are created/updated whenever a student loads a stage page.
 */
export async function getStudentsProgressForTeacher(teacherId: string): Promise<StudentProgress[]> {
  return Array.from(studentProgressStore.values());
}
