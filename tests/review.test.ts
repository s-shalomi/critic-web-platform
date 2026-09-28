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
});
