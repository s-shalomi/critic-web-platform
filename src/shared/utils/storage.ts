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

/**
 * Retrieves the current stage for a student on a specific topic.
 * Always strictly defaults to 'familiarise' (Annotate) for new students or when no stage has been recorded.
 * Never falls back to un-scoped global keys.
 */
export function getStudentCurrentStage(studentId: string, topicId: string): string {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return 'familiarise';
  try {
    const key = `critic_current_stage_${studentId}_${topicId}`;
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    // If not set, or completed/review, always start at familiarise (Annotate)
    if (!saved || saved === 'review') {
      return 'familiarise';
    }
    return saved;
  } catch {
    return 'familiarise';
  }
}

/**
 * Persists the current stage for a student on a specific topic, strictly scoped to their studentId.
 */
export function setStudentCurrentStage(studentId: string, topicId: string, stage: string): void {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
  try {
    const key = `critic_current_stage_${studentId}_${topicId}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, stage);
    }
  } catch (e) {
    console.error(`Error saving stage ${stage} for student ${studentId}:`, e);
  }
}

/**
 * Clears un-scoped legacy stage keys that may have been saved in prior versions,
 * preventing cross-account stage leakage to new access codes.
 */
export function clearLegacyUnscopedStages(): void {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return;
  try {
    const legacyKeys = [
      'critic_current_stage_climate-change',
      'critic_current_stage',
      'critic_current_stage_vaccine-safety',
      'critic_current_stage_mental-wellbeing',
    ];
    if (typeof localStorage !== 'undefined') {
      legacyKeys.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // Non-blocking
  }
}


