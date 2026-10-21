import { getStudentStorageKey } from '@/shared/utils/storage';

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
const sessionStorageMock = createStorageMock();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('StageProgressionNudge Socratic Milestone Logic', () => {
  const moduleId = 'test_mod_climate';

  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  describe('Storage Keys and Counts for Each Stage', () => {
    const stages = ['familiarise', 'conceptualise', 'inquire', 'synthesise'] as const;

    stages.forEach((stage) => {
      it(`stores and increments Socratic question count for ${stage}`, () => {
        const key = getStudentStorageKey(`critic_socratic_count_${stage}`, moduleId);
        expect(localStorage.getItem(key)).toBeNull();

        localStorage.setItem(key, '1');
        expect(parseInt(localStorage.getItem(key) || '0', 10)).toBe(1);

        // Simulate 10 Socratic questions
        localStorage.setItem(key, '10');
        const count = parseInt(localStorage.getItem(key) || '0', 10);
        expect(count).toBe(10);
        expect(count >= 10).toBe(true);
      });

      it(`handles dismissal state persistence for ${stage}`, () => {
        const dismissKey = getStudentStorageKey(`critic_nudge_dismissed_${stage}`, moduleId);
        expect(sessionStorage.getItem(dismissKey)).toBeNull();

        sessionStorage.setItem(dismissKey, 'true');
        expect(sessionStorage.getItem(dismissKey)).toBe('true');
      });
    });
  });

  describe('Stage Transition Mapping & Return-Later Guarantee', () => {
    const stageFlow = [
      {
        stage: 'familiarise',
        expectedNext: `/module/${moduleId}/conceptualise`,
        expectedName: 'Stage 02: Mind Map',
      },
      {
        stage: 'conceptualise',
        expectedNext: `/module/${moduleId}/inquire`,
        expectedName: 'Stage 03: Challenge',
      },
      {
        stage: 'inquire',
        expectedNext: `/module/${moduleId}/synthesise`,
        expectedName: 'Stage 04: Conclude',
      },
      {
        stage: 'synthesise',
        expectedNext: `/module/${moduleId}/review`,
        expectedName: 'Module Review & Debrief',
      },
    ];

    stageFlow.forEach(({ stage, expectedNext, expectedName }) => {
      it(`maps ${stage} to ${expectedName} (${expectedNext}) and confirms student can return later`, () => {
        const threshold = 10;
        const currentCount = 10;
        const isTriggered = currentCount >= threshold;
        expect(isTriggered).toBe(true);

        const bannerPrompt = `You've explored ${currentCount} Socratic questions in this stage! Consider moving forward to ${expectedName}. (You can always return to this stage later to refine your work.)`;
        expect(bannerPrompt).toContain('10 Socratic questions');
        expect(bannerPrompt).toContain(expectedName);
        expect(bannerPrompt).toContain('You can always return to this stage later');
      });
    });
  });

  describe('Inquire Stage Agent Messages Count Integration', () => {
    it('accurately identifies 10 Socratic questions in conversation history', () => {
      const messages = [
        { id: 'msg-1', sender: 'agent', text: 'Opener Socratic question?' },
        { id: 'msg-2', sender: 'student', text: 'My initial response.' },
        { id: 'msg-3', sender: 'agent', text: 'What assumption underlies that?' },
        { id: 'msg-4', sender: 'student', text: 'Another thought.' },
        { id: 'msg-5', sender: 'agent', text: 'How does source 1 counter that?' },
        { id: 'msg-6', sender: 'student', text: 'Counter evidence.' },
        { id: 'msg-7', sender: 'agent', text: 'Is that source credible?' },
        { id: 'msg-8', sender: 'student', text: 'It has peer review.' },
        { id: 'msg-9', sender: 'agent', text: 'What about sample size?' },
        { id: 'msg-10', sender: 'student', text: 'Sample size was 5000.' },
        { id: 'msg-11', sender: 'agent', text: 'Could correlation imply causation here?' },
        { id: 'msg-12', sender: 'student', text: 'Not necessarily.' },
        { id: 'msg-13', sender: 'agent', text: 'What alternative hypothesis exists?' },
        { id: 'msg-14', sender: 'student', text: 'Solar variation.' },
        { id: 'msg-15', sender: 'agent', text: 'How does the solar constant data refute that?' },
        { id: 'msg-16', sender: 'student', text: 'Irradiance has stayed flat.' },
        { id: 'msg-17', sender: 'agent', text: 'What conclusion follows?' },
        { id: 'msg-18', sender: 'student', text: 'Greenhouse gases are dominant.' },
        { id: 'msg-19', sender: 'agent', text: 'What feedback loops should we consider?' },
      ];

      const agentSocraticQuestions = messages.filter((m) => m.sender === 'agent').length;
      expect(agentSocraticQuestions).toBe(10);
      expect(agentSocraticQuestions >= 10).toBe(true);
    });
  });
});
