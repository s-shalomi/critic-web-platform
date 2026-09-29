/**
 * Shared In-Memory Session Store (Singleton)
 *
 * A single module-level store used across all Next.js API route handlers within the same
 * server process. This prevents the "lost state" problem where each route file importing
 * a service module gets a separate Map instance due to hot-reload module isolation.
 *
 * Contains:
 * - Dynamic teacher-added sources (topicId -> Source[])
 * - Live student progress tracking (accessCode -> StudentProgressEntry)
 * - Registered access codes (code -> teacherId)
 */

import type { Source } from '@/domains/topics/topicService';

export interface StudentProgressEntry {
  studentId: string;
  accessCode: string;
  topicTitle: string;
  currentStage: string;
  status: 'in_progress' | 'completed';
  lastActive: string;
}

// Dynamic sources added by teachers at runtime
export const dynamicSourcesStore = new Map<string, Source[]>();

// Live student progress keyed by accessCode
export const studentProgressStore = new Map<string, StudentProgressEntry>();

// Access codes registered by teachers: code -> { teacherId, createdAt, expiresAt }
export interface AccessCodeEntry {
  id: string;
  code: string;
  teacherId: string;
  createdAt: string;
  expiresAt?: string;
}
export const accessCodeStore = new Map<string, AccessCodeEntry>();

// Seed default access codes so CLIMATE2026 / STUDENT123 appear in the teacher panel
const DEFAULT_CODES: AccessCodeEntry[] = [
  {
    id: 'code-1',
    code: 'CLIMATE2026',
    teacherId: 'teacher-demo',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'code-2',
    code: 'STUDENT123',
    teacherId: 'teacher-demo',
    createdAt: new Date().toISOString(),
  },
];
DEFAULT_CODES.forEach((c) => accessCodeStore.set(c.code, c));

/**
 * Records or updates a student's current stage progress.
 * Called by stage API routes (familiarise, conceptualise, inquire, synthesise) on load/activity.
 */
export function upsertStudentProgress(entry: StudentProgressEntry): void {
  studentProgressStore.set(entry.accessCode, {
    ...entry,
    lastActive: new Date().toISOString(),
  });
}

/**
 * Returns all student progress entries for a given teacher.
 * Currently returns all students (any teacher can see all students per requirements.md).
 */
export function getAllStudentProgress(): StudentProgressEntry[] {
  return Array.from(studentProgressStore.values());
}
