import {
  getStudentCurrentStage,
  setStudentCurrentStage,
  clearLegacyUnscopedStages,
} from '../src/shared/utils/storage';

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const localStorageMock = createStorageMock();
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Stage Initialization & New Access Code Isolation Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('New access code with no prior progress starts on the annotation page (familiarise)', () => {
    const studentId = 'student_new_access_code_999';
    const topicId = 'climate-change';

    const stage = getStudentCurrentStage(studentId, topicId);
    expect(stage).toBe('familiarise');
  });

  test('New access code starts on familiarise even if a previous student reached synthesise', () => {
    // Simulate previous student leaving global or other stage keys in browser
    localStorage.setItem('critic_current_stage_climate-change', 'synthesise');
    localStorage.setItem('critic_current_stage', 'synthesise');
    localStorage.setItem('critic_current_stage_prior_student_climate-change', 'synthesise');

    const newStudentId = 'student_fresh_code_888';
    const topicId = 'climate-change';

    // Must strictly ignore prior student's stage and un-scoped keys
    const stage = getStudentCurrentStage(newStudentId, topicId);
    expect(stage).toBe('familiarise');
  });

  test('clearLegacyUnscopedStages removes legacy unscoped stage keys from localStorage', () => {
    localStorage.setItem('critic_current_stage_climate-change', 'synthesise');
    localStorage.setItem('critic_current_stage', 'synthesise');
    localStorage.setItem('critic_current_stage_vaccine-safety', 'inquire');

    clearLegacyUnscopedStages();

    expect(localStorage.getItem('critic_current_stage_climate-change')).toBeNull();
    expect(localStorage.getItem('critic_current_stage')).toBeNull();
    expect(localStorage.getItem('critic_current_stage_vaccine-safety')).toBeNull();
  });

  test('Student progress is preserved when explicitly saved for their studentId', () => {
    const studentId = 'student_midway_777';
    const topicId = 'climate-change';

    setStudentCurrentStage(studentId, topicId, 'conceptualise');

    const stage = getStudentCurrentStage(studentId, topicId);
    expect(stage).toBe('conceptualise');
  });

  test('Completed module (review stage) resets to familiarise on next module entry', () => {
    const studentId = 'student_completed_666';
    const topicId = 'climate-change';

    setStudentCurrentStage(studentId, topicId, 'review');

    const stage = getStudentCurrentStage(studentId, topicId);
    expect(stage).toBe('familiarise');
  });
});
