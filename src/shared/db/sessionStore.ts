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

import fs from 'fs';
import path from 'path';
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
  conceptNodesStore?: Map<string, any[]>;
  conceptLinksStore?: Map<string, any[]>;
  notesStore?: Map<string, any[]>;
}

const criticGlobal = globalThis as unknown as CriticGlobalStore;

const CACHE_FILE = path.join(process.cwd(), '.critic_session_store.json');

export function saveStoreToDisk(): void {
  try {
    const data = {
      dynamicSources: Array.from(criticGlobal.dynamicSourcesStore?.entries() || []),
      accessCodes: Array.from(criticGlobal.accessCodeStore?.entries() || []),
      studentProgress: Array.from(criticGlobal.studentProgressStore?.entries() || []),
      notes: Array.from(criticGlobal.notesStore?.entries() || []),
      conceptNodes: Array.from(criticGlobal.conceptNodesStore?.entries() || []),
      conceptLinks: Array.from(criticGlobal.conceptLinksStore?.entries() || []),
      reviewStats: Array.from(criticGlobal.reviewStatsStore?.entries() || []),
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Non-blocking fallback for read-only environments
  }
}

function loadStoreFromDisk(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.dynamicSources)) {
        data.dynamicSources.forEach(([k, v]: [string, Source[]]) => {
          criticGlobal.dynamicSourcesStore?.set(k, v);
        });
      }
      if (Array.isArray(data.accessCodes)) {
        data.accessCodes.forEach(([k, v]: [string, AccessCodeEntry]) => {
          criticGlobal.accessCodeStore?.set(k, v);
        });
      }
      if (Array.isArray(data.studentProgress)) {
        data.studentProgress.forEach(([k, v]: [string, StudentProgressEntry]) => {
          criticGlobal.studentProgressStore?.set(k, v);
        });
      }
      if (Array.isArray(data.notes)) {
        data.notes.forEach(([k, v]: [string, any[]]) => {
          criticGlobal.notesStore?.set(k, v);
        });
      }
      if (Array.isArray(data.conceptNodes)) {
        data.conceptNodes.forEach(([k, v]: [string, any[]]) => {
          criticGlobal.conceptNodesStore?.set(k, v);
        });
      }
      if (Array.isArray(data.conceptLinks)) {
        data.conceptLinks.forEach(([k, v]: [string, any[]]) => {
          criticGlobal.conceptLinksStore?.set(k, v);
        });
      }
      if (Array.isArray(data.reviewStats)) {
        data.reviewStats.forEach(([k, v]: [string, any]) => {
          criticGlobal.reviewStatsStore?.set(k, v);
        });
      }
    }
  } catch (err) {
    // Silent fallback
  }
}

if (!criticGlobal.dynamicSourcesStore) {
  criticGlobal.dynamicSourcesStore = new Map<string, Source[]>();
}
if (!criticGlobal.studentProgressStore) {
  criticGlobal.studentProgressStore = new Map<string, StudentProgressEntry>();
}
if (!criticGlobal.conceptNodesStore) {
  criticGlobal.conceptNodesStore = new Map<string, any[]>();
}
if (!criticGlobal.conceptLinksStore) {
  criticGlobal.conceptLinksStore = new Map<string, any[]>();
}
if (!criticGlobal.notesStore) {
  criticGlobal.notesStore = new Map<string, any[]>();
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

// Hydrate from disk on initial boot
loadStoreFromDisk();

export const dynamicSourcesStore = criticGlobal.dynamicSourcesStore!;
export const studentProgressStore = criticGlobal.studentProgressStore!;
export const accessCodeStore = criticGlobal.accessCodeStore!;
export const reviewStatsStore = criticGlobal.reviewStatsStore!;
export const conceptNodesStore = criticGlobal.conceptNodesStore!;
export const conceptLinksStore = criticGlobal.conceptLinksStore!;
export const notesStore = criticGlobal.notesStore!;

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
  saveStoreToDisk();
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


