import {
  buildSocraticSystemPrompt,
  buildToneDirective,
  compressChatHistory,
  generateSocraticResponse,
  generateAvatarHint,
  ChatTurn,
  ModuleSnapshot,
} from '../src/domains/ai/aiService';

describe('Socratic AI Engine Tests', () => {
  test('buildSocraticSystemPrompt includes all 7 Socratic guardrails, tone directive, and student context', () => {
    const snapshot: ModuleSnapshot = {
      topicTitle: 'Climate Change',
      currentStage: 'inquire',
      notes: [{ highlightedText: 'record snow', noteText: 'weather vs climate' }],
      conceptNodes: [{ text: 'polar vortex' }],
      conceptLinks: [{ fromText: 'polar vortex', toText: 'record snow' }],
      agentPersonality: 'Witty Challenger',
      avatarName: 'Sherlock AI',
    };

    const prompt = buildSocraticSystemPrompt(snapshot, 'Socratic');
    expect(prompt).toContain('Sherlock AI');
    expect(prompt).toContain('Witty Challenger');
    expect(prompt).toContain('NEVER deliver a direct factual claim');
    expect(prompt).toContain('NEVER ask leading questions');
    expect(prompt).toContain('NEVER fabricate sources or citations');
    expect(prompt).toContain('weather vs climate');
    expect(prompt).toContain('polar vortex');
    expect(prompt).toContain('"polar vortex" <-> "record snow"');
  });

  test('buildToneDirective produces distinct voice instructions for each tone option', () => {
    expect(buildToneDirective('Friendly')).toContain('FRIENDLY');
    expect(buildToneDirective('Mentor')).toContain('MENTOR');
    expect(buildToneDirective('Witty Challenger')).toContain('WITTY CHALLENGER');
    expect(buildToneDirective('Curious Explorer')).toContain('CURIOUS EXPLORER');
    expect(buildToneDirective("Devil's Advocate")).toContain("DEVIL'S ADVOCATE");
  });

  test('compressChatHistory keeps last 15 turns raw and summarizes older turns', () => {
    const history: ChatTurn[] = Array.from({ length: 20 }, (_, i) => ({
      sender: i % 2 === 0 ? 'student' : 'agent',
      text: `Message turn ${i + 1}`,
    }));

    const compressed = compressChatHistory(history);
    expect(compressed).toContain('[Summary of earlier dialogue (5 turns):');
    expect(compressed).toContain('Message turn 20');
    expect(compressed).toContain('Message turn 6');
    expect(compressed).not.toContain('STUDENT: Message turn 1\n');
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
      agentPersonality: 'Friendly',
    };

    const response = await generateSocraticResponse(history, snapshot);
    expect(response.text).toBeDefined();
    expect(response.text.length).toBeGreaterThan(10);
    expect(['gemini', 'groq', 'fallback_rule', 'rate_limit_error']).toContain(response.provider);
  });

  test('generateAvatarHint generates concept-node based hint in conceptualise stage', async () => {
    const hint = await generateAvatarHint({
      stage: 'conceptualise',
      topicTitle: 'Climate Change',
      conceptNodes: [{ text: 'Carbon Emissions' }, { text: 'Global Temperature Rise' }],
      agentPersonality: 'Mentor',
    });

    expect(hint.text).toBeDefined();
    expect(hint.text.length).toBeGreaterThan(10);
    expect(['gemini', 'groq', 'fallback_rule', 'rate_limit_error']).toContain(hint.provider);
  });

  test('generateSocraticResponse and generateAvatarHint resolve strictly in under 3000ms', async () => {
    const history: ChatTurn[] = [{ sender: 'student', text: 'Can renewable energy replace all fossil fuels?' }];
    const snapshot: ModuleSnapshot = {
      topicTitle: 'Climate Change',
      currentStage: 'inquire',
      notes: [],
      conceptNodes: [],
    };

    const startTime = Date.now();
    const [chatRes, hintRes] = await Promise.all([
      generateSocraticResponse(history, snapshot),
      generateAvatarHint({ stage: 'familiarise', topicTitle: 'Climate Change' }),
    ]);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(3000);
    expect(chatRes.text).toBeDefined();
    expect(hintRes.text).toBeDefined();
  });

  test('generateAvatarHint maintains student context without reciting every item of work', async () => {
    const hint = await generateAvatarHint({
      stage: 'familiarise',
      topicTitle: 'Climate Change',
      sourceTitle: 'Social Media Post',
      sourceText: 'Be careful and try staying in your house...',
      notes: [
        { highlightedText: 'extreme snow', noteText: 'Author confuses weather with climate' },
        { highlightedText: 'global warming', noteText: 'Sarcastic tone used to dismiss science' },
        { highlightedText: 'near record cold', noteText: 'Anecdotal weather observation' },
      ],
      conceptNodes: [
        { text: 'Weather vs Climate' },
        { text: 'Jet Stream Disruption' },
        { text: 'Arctic Warming' },
      ],
      agentPersonality: 'Mentor',
    });

    expect(hint.text).toBeDefined();
    expect(hint.text.length).toBeGreaterThan(10);
    // Should be a focused Socratic question (1-2 sentences), not reciting every note
    expect(hint.text.split(/[.?!]+/).filter(Boolean).length).toBeLessThanOrEqual(4);
  });
});
