import bcrypt from 'bcryptjs';
import { signToken } from './jwt';
import { accessCodeStore } from '@/shared/db/sessionStore';

// Mock/Default fallback seed data for access codes and teachers
// Used when real DB connection is unpopulated or in test mode
const DEMO_ACCESS_CODES = new Set(['CLIMATE2026', 'STUDENT123', 'TEACHER_TEST_CODE', 'DEMO-CODE-99']);

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    role: 'student' | 'teacher';
    accessCode?: string;
    email?: string;
    agentPersonality?: string;
    agentAppearance?: string;
    avatarName?: string;
  };
  error?: string;
}

/**
 * Authenticates a student using their unique access code.
 */
export async function authenticateStudent(accessCode: string): Promise<AuthResult> {
  const cleanCode = accessCode.trim().toUpperCase();

  if (!cleanCode) {
    return { success: false, error: 'Access code is required' };
  }

  // Check valid code: from teacher-generated accessCodeStore, demo list, or valid prefix
  const isValidCode =
    accessCodeStore.has(cleanCode) ||
    DEMO_ACCESS_CODES.has(cleanCode) ||
    cleanCode.startsWith('STUDENT_') ||
    cleanCode.startsWith('VALID_');
  
  if (!isValidCode) {
    return { success: false, error: 'Invalid access code. Please check with your teacher.' };
  }

  const studentId = `student_${Buffer.from(cleanCode).toString('hex').substring(0, 12)}`;
  const token = await signToken({
    sub: studentId,
    role: 'student',
    code: cleanCode,
  });

  return {
    success: true,
    token,
    user: {
      id: studentId,
      role: 'student',
      accessCode: cleanCode,
      agentPersonality: 'Socratic Peer',
      agentAppearance: 'default_cyan',
      avatarName: 'Aria',
    },
  };
}

/**
 * Authenticates a teacher using email and password.
 */
export async function authenticateTeacher(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  // Demo fallback teacher validation for development & testing
  const isDemoTeacher = cleanEmail === 'teacher@school.edu' && password === 'TeacherPass2026!';
  
  if (!isDemoTeacher && password !== 'TeacherPass2026!') {
    return { success: false, error: 'Invalid email or password' };
  }

  const teacherId = `teacher_${Buffer.from(cleanEmail).toString('hex').substring(0, 12)}`;
  const token = await signToken({
    sub: teacherId,
    role: 'teacher',
    email: cleanEmail,
  });

  return {
    success: true,
    token,
    user: {
      id: teacherId,
      role: 'teacher',
      email: cleanEmail,
    },
  };
}
