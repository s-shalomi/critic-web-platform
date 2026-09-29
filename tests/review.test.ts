import { generateModuleReview } from '../src/domains/review/reviewService';

describe('Review Domain Tests', () => {
  test('generateModuleReview calculates 6 core metrics and unlocked badges', async () => {
    const moduleId = 'test_review_mod';
    const review = await generateModuleReview(moduleId, {
      conceptsCount: 6,
      notesCount: 5,
      chatTurnsCount: 10,
    });

    expect(review.moduleId).toBe(moduleId);
    expect(review.conceptsIdentified).toBe(6);
    expect(review.assumptionsChallenged).toBe(5);
    expect(review.questionsAsked).toBe(10);
    expect(review.criticalThinkingScore).toBeGreaterThan(70);
    expect(review.synthesisScore).toBeGreaterThan(70);
    expect(review.badges.length).toBe(6);
    expect(review.badges[0].unlocked).toBe(true);
  });

  test('generateModuleReview generates shareable MBTI-like reasoning personality title', async () => {
    const review = await generateModuleReview('test_mbti');
    expect(review.mbtiPersonalityTitle).toContain('Investigator');
    expect(review.mbtiPersonalitySummary.length).toBeGreaterThan(20);
  });

  test('getExistingModuleReview retrieves saved review data without recalculating defaults', async () => {
    const { getExistingModuleReview } = await import('../src/domains/review/reviewService');
    const moduleId = 'saved_module_eval';
    await generateModuleReview(moduleId, {
      conceptsCount: 8,
      notesCount: 4,
      chatTurnsCount: 7,
      devilsAdvocateCount: 3,
      synthesisLength: 250,
    });

    const retrieved = await getExistingModuleReview(moduleId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.conceptsIdentified).toBe(8);
    expect(retrieved?.assumptionsChallenged).toBe(4);
    expect(retrieved?.questionsAsked).toBe(7);
    expect(retrieved?.misinformationEvaluations).toBe(3);
  });
});
