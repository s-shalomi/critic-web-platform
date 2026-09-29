/**
 * Storage Utility
 * Provides student-scoped local storage keys so each student account
 * has isolated notes, nodes, canvas links, chat history, and synthesis drafts.
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
