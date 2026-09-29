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

export interface AccessCodeEntry {
  id: string;
  code: string;
  teacherId: string;
  createdAt: string;
  expiresAt?: string;
}

// Global container to persist state across Next.js webpack/turbopack bundles & hot-reloads
interface CriticGlobalStore {
  dynamicSourcesStore?: Map<string, Source[]>;
  studentProgressStore?: Map<string, StudentProgressEntry>;
  accessCodeStore?: Map<string, AccessCodeEntry>;
  reviewStatsStore?: Map<string, any>;
}

const criticGlobal = globalThis as unknown as CriticGlobalStore;

if (!criticGlobal.dynamicSourcesStore) {
  criticGlobal.dynamicSourcesStore = new Map<string, Source[]>();
}
if (!criticGlobal.studentProgressStore) {
  criticGlobal.studentProgressStore = new Map<string, StudentProgressEntry>();
}
if (!criticGlobal.accessCodeStore) {
  criticGlobal.accessCodeStore = new Map<string, AccessCodeEntry>();

  // Seed default access codes
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
  DEFAULT_CODES.forEach((c) => criticGlobal.accessCodeStore!.set(c.code, c));
}
if (!criticGlobal.reviewStatsStore) {
  criticGlobal.reviewStatsStore = new Map<string, any>();
}

export const dynamicSourcesStore = criticGlobal.dynamicSourcesStore!;
export const studentProgressStore = criticGlobal.studentProgressStore!;
export const accessCodeStore = criticGlobal.accessCodeStore!;
export const reviewStatsStore = criticGlobal.reviewStatsStore!;

/**
 * Records or updates a student's current stage progress.
 * Keyed by accessCode (or studentId if accessCode is missing).
 */
export function upsertStudentProgress(entry: StudentProgressEntry): void {
  const key = entry.accessCode || entry.studentId;
  studentProgressStore.set(key, {
    ...entry,
    lastActive: new Date().toISOString(),
  });
}

/**
 * Returns all student progress entries for a given teacher.
 * Currently returns all students (any teacher can see all students per requirements.md).
 */
export function getAllStudentProgress(): StudentProgressEntry[] {
  return Array.from(studentProgressStore.values()).sort(
    (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
  );
}

