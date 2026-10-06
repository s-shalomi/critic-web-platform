import {
  buildSocraticSystemPrompt,
  compressChatHistory,
  generateSocraticResponse,
  ChatTurn,
  ModuleSnapshot,
} from '../src/domains/ai/aiService';

describe('Socratic AI Engine Tests', () => {
  test('buildSocraticSystemPrompt includes Socratic guardrails and student notes context', () => {
    const snapshot: ModuleSnapshot = {
      topicTitle: 'Climate Change',
      currentStage: 'inquire',
      notes: [{ highlightedText: 'record snow', noteText: 'weather vs climate' }],
      conceptNodes: [{ text: 'polar vortex' }],
      agentPersonality: 'Investigative Detective',
      avatarName: 'Sherlock AI',
    };

    const prompt = buildSocraticSystemPrompt(snapshot, 'Socratic');
    expect(prompt).toContain('Sherlock AI');
    expect(prompt).toContain('Investigative Detective');
    expect(prompt).toContain('NEVER deliver a direct factual claim');
    expect(prompt).toContain('weather vs climate');
    expect(prompt).toContain('polar vortex');
  });

  test('compressChatHistory keeps last 10 turns raw and summarizes older turns', () => {
    const history: ChatTurn[] = Array.from({ length: 15 }, (_, i) => ({
      sender: i % 2 === 0 ? 'student' : 'agent',
      text: `Message turn ${i + 1}`,
    }));

    const compressed = compressChatHistory(history);
    expect(compressed).toContain('[Summary of earlier dialogue');
    expect(compressed).toContain('Message turn 15');
    expect(compressed).not.toContain('Message turn 1\n');
  });

  test('generateSocraticResponse returns valid Socratic response via fallback mechanism', async () => {
    const history: ChatTurn[] = [
      { sender: 'student', text: 'If it snows a lot in winter, climate change must be false.' },
    ];
    const snapshot: ModuleSnapshot = {
      topicTitle: 'Climate Change',
      currentStage: 'inquire',
      notes: [],
      conceptNodes: [],
    };

    const response = await generateSocraticResponse(history, snapshot);
    expect(response.text).toBeDefined();
    expect(response.text.length).toBeGreaterThan(10);
    expect(['gemini', 'groq', 'fallback_rule', 'rate_limit_error']).toContain(response.provider);
  });

  test('generateAvatarHint generates concept-node based hint in conceptualise stage', async () => {
    const { generateAvatarHint } = await import('../src/domains/ai/aiService');
    const hint = await generateAvatarHint({
      stage: 'conceptualise',
      topicTitle: 'Climate Change',
      conceptNodes: [{ text: 'Carbon Emissions' }, { text: 'Global Temperature Rise' }],
    });

    expect(hint.text).toBeDefined();
    expect(hint.text.length).toBeGreaterThan(10);
    expect(['gemini', 'groq', 'fallback_rule', 'rate_limit_error']).toContain(hint.provider);
  });
});
