/**
 * Storage Utility
 * Provides student-scoped local storage keys so each student account
 * has isolated notes, nodes, canvas links, chat history, synthesis drafts,
 * and first-entry module disclosure flags.
 */

export function getStudentStorageKey(prefix: string, moduleId: string): string {
  if (typeof window === 'undefined') {
    return `${prefix}_guest_${moduleId}`;
  }

  try {
    const userStr = localStorage.getItem('critic_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const studentId = user.id || user.email || user.name || 'default_student';
      return `${prefix}_${studentId}_${moduleId}`;
    }
  } catch (e) {
    console.error('Error reading critic_user from localStorage:', e);
  }

  return `${prefix}_guest_${moduleId}`;
}

/**
 * Checks whether the current student has already been shown the mandatory
 * start-of-module AI disclosure for the given moduleId.
 */
export function hasSeenModuleDisclosure(moduleId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = getStudentStorageKey('critic_disclosure_seen', moduleId);
    return localStorage.getItem(key) === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Marks the mandatory start-of-module AI disclosure as seen for the current
 * student and moduleId so it is only automatically displayed once on initial entry.
 */
export function markModuleDisclosureSeen(moduleId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getStudentStorageKey('critic_disclosure_seen', moduleId);
    localStorage.setItem(key, 'true');
  } catch (e) {
    console.error('Error saving critic_disclosure_seen to localStorage:', e);
  }
}
