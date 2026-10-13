/**
 * Storage Utility
 * Provides student-scoped local storage keys so each student account
 * has isolated notes, nodes, canvas links, chat history, synthesis drafts,
 * and first-entry module disclosure flags.
 */

export function getStudentStorageKey(prefix: string, moduleId: string): string {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') {
    return `${prefix}_guest_${moduleId}`;
  }

  try {
    const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem('critic_user') : null;
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
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return false;
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
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
  try {
    const key = getStudentStorageKey('critic_disclosure_seen', moduleId);
    localStorage.setItem(key, 'true');
  } catch (e) {
    console.error('Error saving critic_disclosure_seen to localStorage:', e);
  }
}

/**
 * Checks whether the current student has already been shown the onboarding
 * tutorial for a specific stage within the given module.
 */
export function hasSeenStageTutorial(moduleId: string, stage: string): boolean {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return false;
  try {
    const key = getStudentStorageKey(`critic_tutorial_seen_${stage}`, moduleId);
    return localStorage.getItem(key) === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Marks the stage onboarding tutorial as seen so it does not auto-open again on entry.
 */
export function markStageTutorialSeen(moduleId: string, stage: string): void {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
  try {
    const key = getStudentStorageKey(`critic_tutorial_seen_${stage}`, moduleId);
    localStorage.setItem(key, 'true');
  } catch (e) {
    console.error(`Error saving tutorial seen for stage ${stage}:`, e);
  }
}

/**
 * Resets the stage onboarding tutorial seen flag.
 */
export function resetStageTutorial(moduleId: string, stage: string): void {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
  try {
    const key = getStudentStorageKey(`critic_tutorial_seen_${stage}`, moduleId);
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error resetting tutorial seen for stage ${stage}:`, e);
  }
}

