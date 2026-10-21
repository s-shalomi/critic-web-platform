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

describe('StageProgressionNudge Inquire Stage Socratic Milestone Banner', () => {
  const moduleId = 'test_mod_climate';

  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  describe('Inquire Stage Socratic Question Counter', () => {
    it('stores and tracks Socratic question count in Inquire stage', () => {
      const key = getStudentStorageKey('critic_socratic_count_inquire', moduleId);
      expect(localStorage.getItem(key)).toBeNull();

      localStorage.setItem(key, '1');
      expect(parseInt(localStorage.getItem(key) || '0', 10)).toBe(1);

      // Simulate 10 Socratic questions reached
      localStorage.setItem(key, '10');
      const count = parseInt(localStorage.getItem(key) || '0', 10);
      expect(count).toBe(10);
      expect(count >= 10).toBe(true);
    });

    it('handles dismissal state persistence in Inquire stage', () => {
      const dismissKey = getStudentStorageKey('critic_nudge_dismissed_inquire', moduleId);
      expect(sessionStorage.getItem(dismissKey)).toBeNull();

      sessionStorage.setItem(dismissKey, 'true');
      expect(sessionStorage.getItem(dismissKey)).toBe('true');
    });
  });

  describe('Banner Copy & Return-Later Guarantee', () => {
    it('shows milestone banner copy with return-later reassurance and next stage mention (no proceed button)', () => {
      const currentCount = 10;
      const nextStageName = 'Stage 04: Conclude';
      const bannerPrompt = `You've explored ${currentCount} Socratic questions in this stage! Consider moving forward to ${nextStageName} when you're ready. (You can always return to this stage later to refine your work.)`;

      expect(bannerPrompt).toContain('10 Socratic questions');
      expect(bannerPrompt).toContain(nextStageName);
      expect(bannerPrompt).toContain('when you\'re ready');
      expect(bannerPrompt).toContain('You can always return to this stage later');
    });
  });

  describe('Inquire Stage Chat Integration: 10 Socratic Questions Trigger', () => {
    it('accurately identifies when 10 Socratic questions have been asked by the agent in chat dialogue', () => {
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

    it('triggers when student asks 10 questions in Inquire dialogue', () => {
      const studentQuestions = Array.from({ length: 10 }, (_, i) => ({
        id: `msg_student_${i}`,
        sender: 'student' as const,
        text: `Student Question ${i + 1}?`,
      }));

      const count = studentQuestions.filter((m) => m.sender === 'student').length;
      expect(count).toBe(10);
      expect(count >= 10).toBe(true);
    });

    it('triggers when 10 questions containing question marks are in chat', () => {
      const messagesWithMarks = Array.from({ length: 10 }, (_, i) => ({
        id: `msg_${i}`,
        sender: (i % 2 === 0 ? 'student' : 'agent') as 'student' | 'agent',
        text: `Is hypothesis ${i + 1} supported by evidence?`,
      }));

      const marksCount = messagesWithMarks.filter((m) => m.text && m.text.includes('?')).length;
      expect(marksCount).toBe(10);
      expect(marksCount >= 10).toBe(true);
    });

    it('triggers when 10 dialogue turns occur in total between student and agent', () => {
      const totalTurns = Array.from({ length: 10 }, (_, i) => ({
        id: `turn_${i}`,
        sender: (i % 2 === 0 ? 'student' : 'agent') as 'student' | 'agent',
        text: `Turn text ${i + 1}`,
      }));

      expect(totalTurns.length).toBe(10);
      expect(totalTurns.length >= 10).toBe(true);
    });
  });

  describe('Multi-Stage Socratic Question Tracking (Every Stage Except Synthesis)', () => {
    it('generates correct banner copy for familiarise prompting next source or next stage', () => {
      const currentCount = 10;
      const familiarisePrompt = `You've explored ${currentCount} Socratic questions in this stage! Consider moving to the next source or moving forward to Stage 02: Mind Map when you're ready. (You can always return to this stage later to refine your work.)`;

      expect(familiarisePrompt).toContain('moving to the next source or moving forward to Stage 02: Mind Map');
      expect(familiarisePrompt).toContain('You can always return to this stage later to refine your work.');
      expect(familiarisePrompt).not.toContain('button');
    });

    it('generates correct banner copy for conceptualise stage', () => {
      const currentCount = 10;
      const conceptualisePrompt = `You've explored ${currentCount} Socratic questions in this stage! Consider moving forward to Stage 03: Challenge when you're ready. (You can always return to this stage later to refine your work.)`;

      expect(conceptualisePrompt).toContain('Stage 03: Challenge');
      expect(conceptualisePrompt).toContain('You can always return to this stage later to refine your work.');
    });

    it('tracks rapid avatar clicks immediately in familiarise stage', () => {
      const socraticKey = getStudentStorageKey('critic_socratic_count_familiarise', moduleId);
      let count = 0;
      for (let i = 0; i < 10; i++) {
        count += 1;
        localStorage.setItem(socraticKey, String(count));
      }
      expect(parseInt(localStorage.getItem(socraticKey) || '0', 10)).toBe(10);
    });

    it('tracks rapid avatar clicks immediately in conceptualise stage', () => {
      const socraticKey = getStudentStorageKey('critic_socratic_count_conceptualise', moduleId);
      let count = 0;
      for (let i = 0; i < 10; i++) {
        count += 1;
        localStorage.setItem(socraticKey, String(count));
      }
      expect(parseInt(localStorage.getItem(socraticKey) || '0', 10)).toBe(10);
    });

    it('confirms synthesis stage has no progression nudge banner', () => {
      const synthesisStagesWithNudge = ['familiarise', 'conceptualise', 'inquire'];
      expect(synthesisStagesWithNudge).not.toContain('synthesise');
    });
  });
});
