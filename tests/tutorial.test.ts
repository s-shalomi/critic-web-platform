import {
  hasSeenStageTutorial,
  markStageTutorialSeen,
  resetStageTutorial,
} from '@/shared/utils/storage';
import { STAGE_TUTORIAL_STEPS } from '@/shared/config/tutorials';
import { STAGE_OVERVIEWS } from '@/shared/config/stageOverviews';

const createLocalStorageMock = () => {
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

const localStorageMock = createLocalStorageMock();
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Tooltip Onboarding Tutorial & Stage Overviews', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Storage Utilities for Stage Tutorials', () => {
    it('returns false for unseen stage tutorials initially', () => {
      expect(hasSeenStageTutorial('mod_test_1', 'familiarise')).toBe(false);
      expect(hasSeenStageTutorial('mod_test_1', 'conceptualise')).toBe(false);
      expect(hasSeenStageTutorial('mod_test_1', 'inquire')).toBe(false);
      expect(hasSeenStageTutorial('mod_test_1', 'synthesise')).toBe(false);
    });

    it('marks stage tutorials as seen independently', () => {
      markStageTutorialSeen('mod_test_1', 'familiarise');
      expect(hasSeenStageTutorial('mod_test_1', 'familiarise')).toBe(true);
      expect(hasSeenStageTutorial('mod_test_1', 'conceptualise')).toBe(false);

      markStageTutorialSeen('mod_test_1', 'conceptualise');
      expect(hasSeenStageTutorial('mod_test_1', 'conceptualise')).toBe(true);
    });

    it('resets stage tutorial seen flag properly', () => {
      markStageTutorialSeen('mod_test_1', 'inquire');
      expect(hasSeenStageTutorial('mod_test_1', 'inquire')).toBe(true);

      resetStageTutorial('mod_test_1', 'inquire');
      expect(hasSeenStageTutorial('mod_test_1', 'inquire')).toBe(false);
    });

    it('isolates stage tutorials between different module IDs', () => {
      markStageTutorialSeen('mod_module_A', 'familiarise');
      expect(hasSeenStageTutorial('mod_module_A', 'familiarise')).toBe(true);
      expect(hasSeenStageTutorial('mod_module_B', 'familiarise')).toBe(false);
    });
  });

  describe('STAGE_TUTORIAL_STEPS Configuration', () => {
    const stages = ['familiarise', 'conceptualise', 'inquire', 'synthesise'] as const;

    it('defines non-empty steps for all 4 stages', () => {
      stages.forEach((stage) => {
        const steps = STAGE_TUTORIAL_STEPS[stage];
        expect(Array.isArray(steps)).toBe(true);
        expect(steps.length).toBeGreaterThan(0);
      });
    });

    it('validates step structure and content readability', () => {
      stages.forEach((stage) => {
        const steps = STAGE_TUTORIAL_STEPS[stage];
        steps.forEach((step) => {
          expect(step.targetSelector).toMatch(/^\[data-tour="[\w-]+"]$/);
          expect(step.title.trim().length).toBeGreaterThan(0);
          expect(step.content.trim().length).toBeGreaterThan(0);
          // Keep tooltips concise (under 250 characters each)
          expect(step.content.length).toBeLessThan(250);
        });
      });
    });

    it('satisfies specific stage feature requirements', () => {
      // Annotate stage requirements (dock, ?, sources, highlight, note management, hints)
      const familiariseSteps = STAGE_TUTORIAL_STEPS.familiarise;
      const famSelectors = familiariseSteps.map((s) => s.targetSelector);
      expect(famSelectors).toContain('[data-tour="stage-dock"]');
      expect(famSelectors).toContain('[data-tour="help-btn"]');
      expect(famSelectors).toContain('[data-tour="sidebar-sources"]');
      expect(famSelectors).toContain('[data-tour="source-reading"]');
      expect(famSelectors).toContain('[data-tour="agent-dock"]');
      expect(
        familiariseSteps.some(
          (s) => s.content.toLowerCase().includes('edit or delete') && s.content.toLowerCase().includes('convert')
        )
      ).toBe(true);

      // Mind Map stage requirements (no dock or ? button)
      const conceptualiseSteps = STAGE_TUTORIAL_STEPS.conceptualise;
      const conSelectors = conceptualiseSteps.map((s) => s.targetSelector);
      expect(conSelectors).toContain('[data-tour="sources-sidebar"]');
      expect(conSelectors).toContain('[data-tour="tool-pan"]');
      expect(conSelectors).toContain('[data-tour="tool-node"]');
      expect(conSelectors).toContain('[data-tour="tool-link"]');
      expect(conSelectors).toContain('[data-tour="tool-zoom"]');
      expect(conSelectors).toContain('[data-tour="collapse-btn"]');
      expect(conSelectors).not.toContain('[data-tour="stage-dock"]');
      expect(conSelectors).not.toContain('[data-tour="help-btn"]');
      expect(
        conceptualiseSteps.some(
          (s) => s.content.toLowerCase().includes('select a node to edit and delete')
        )
      ).toBe(true);

      // Challenge stage requirements (chat, concept canvas reference, navigation dock; no ? button)
      const inquireSteps = STAGE_TUTORIAL_STEPS.inquire;
      const inqSelectors = inquireSteps.map((s) => s.targetSelector);
      expect(inqSelectors).toContain('[data-tour="chat-panel"]');
      expect(inqSelectors).toContain('[data-tour="concept-canvas"]');
      expect(inqSelectors).toContain('[data-tour="stage-dock"]');
      expect(inqSelectors).not.toContain('[data-tour="help-btn"]');

      // Conclude stage requirements (conclusion, audit, submit; no dock or ? button)
      const synthesiseSteps = STAGE_TUTORIAL_STEPS.synthesise;
      const synSelectors = synthesiseSteps.map((s) => s.targetSelector);
      expect(synSelectors).toContain('[data-tour="conclusion-box"]');
      expect(synSelectors).toContain('[data-tour="audit-btn"]');
      expect(synSelectors).toContain('[data-tour="submit-btn"]');
      expect(synSelectors).not.toContain('[data-tour="stage-dock"]');
      expect(synSelectors).not.toContain('[data-tour="help-btn"]');
    });
  });

  describe('STAGE_OVERVIEWS Configuration (? Button)', () => {
    const stages = ['familiarise', 'conceptualise', 'inquire', 'synthesise'] as const;

    it('provides comprehensive importance and actionable items for all 4 stages', () => {
      stages.forEach((stage) => {
        const overview = STAGE_OVERVIEWS[stage];
        expect(overview.stageName.trim().length).toBeGreaterThan(0);
        expect(overview.whyImportant.trim().length).toBeGreaterThan(20);
        expect(overview.overviewItems.length).toBeGreaterThanOrEqual(3);

        overview.overviewItems.forEach((item) => {
          expect(item.title.trim().length).toBeGreaterThan(0);
          expect(item.description.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });
});
