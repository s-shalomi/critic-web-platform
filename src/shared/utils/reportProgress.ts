/**
 * reportStudentProgress
 *
 * Client-side utility called from each stage page on mount to inform the server
 * (and therefore the teacher portal) of the student's current stage.
 *
 * Reads student identity from localStorage 'critic_user', then PINGs the
 * POST /api/students/progress endpoint. Fire-and-forget — does not block page load.
 */

export function reportStudentProgress(
  currentStage: string,
  topicTitle = 'Climate Change',
  status: 'in_progress' | 'completed' = 'in_progress'
): void {
  if (typeof window === 'undefined') return;

  try {
    const userStr = localStorage.getItem('critic_user');
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const studentId: string = user.id || user.email || 'guest';
    const accessCode: string = user.accessCode || user.code || studentId;

    // Persist current stage in localStorage for seamless resume
    localStorage.setItem(`critic_current_stage_${topicTitle.toLowerCase().replace(/\s+/g, '-')}`, currentStage);

    // Fire-and-forget — teacher dashboard polls; this keeps it fresh
    fetch('/api/students/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, accessCode, topicTitle, currentStage, status }),
    }).catch((err) => console.warn('[reportStudentProgress] failed:', err));
  } catch (e) {
    console.warn('[reportStudentProgress] error reading critic_user:', e);
  }
}

