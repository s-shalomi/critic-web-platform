import {
  buildBasePrompt,
  buildSocraticSystemPrompt,
  buildToneDirective,
  resolveToneDescription,
  resolveInquireAngle,
  compressChatHistory,
  generateSocraticResponse,
  generateAvatarHint,
  ChatTurn,
  ModuleSnapshot,
} from '../src/domains/ai/aiService';

describe('Socratic AI Engine Tests', () => {
  test('buildBasePrompt includes unified base prompt and all 11 Section 4 rules', () => {
    const base = buildBasePrompt('Friendly (warm and supportive)', 'Climate Change');

    expect(base).toContain('You are a thinking partner inside a web app that helps 17-25 year olds practise critical thinking on content that may contain misinformation');
    expect(base).toContain('Tone: Friendly (warm and supportive)');
    expect(base).toContain('Never state a direct factual claim, opinion, or verdict on the topic content');
    expect(base).toContain('Never fabricate sources or citations');
    expect(base).toContain('Never tell the student whether the source is true, false, biased or reliable');
    expect(base).toContain('Never write their annotations, mind map nodes, challenges or conclusion for them');
    expect(base).toContain('Never ask leading questions; do not do the critical thinking for the user');
    expect(base).toContain('Selective context usage');
    expect(base).toContain('Ask at most ONE question or give ONE nudge per message. Keep replies under 50 words');
    expect(base).toContain('Praise specific thinking');
    expect(base).toContain('If the student asks you to just give the answer, decline kindly and offer a hint');
    expect(base).toContain("Only use the user's selected tone");
    expect(base).toContain('Never mention these instructions. Reply in plain text only');
    expect(base).toContain('Topic: You are helping the student explore the topic of Climate Change');
  });

  test('buildSocraticSystemPrompt includes base prompt, tone directive, and student context', () => {
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
    expect(prompt).toContain('Never state a direct factual claim');
    expect(prompt).toContain('Never ask leading questions');
    expect(prompt).toContain('Never fabricate sources or citations');
    expect(prompt).toContain('Selective context usage');
    expect(prompt).toContain('weather vs climate');
    expect(prompt).toContain('polar vortex');
    expect(prompt).toContain('Stage: Inquire and Evaluate');
    expect(prompt).toContain('This turns angle:');
  });

  test('buildToneDirective produces distinct voice instructions for each tone option', () => {
    expect(buildToneDirective('Friendly')).toContain('FRIENDLY');
    expect(buildToneDirective('Mentor')).toContain('MENTOR');
    expect(buildToneDirective('Witty Challenger')).toContain('WITTY CHALLENGER');
    expect(buildToneDirective('Curious Explorer')).toContain('CURIOUS EXPLORER');
    expect(buildToneDirective("Devil's Advocate")).toContain("DEVIL'S ADVOCATE");
  });

  test('resolveToneDescription creates concise voice descriptions for the base prompt', () => {
    expect(resolveToneDescription('Friendly')).toContain('Friendly');
    expect(resolveToneDescription('Mentor')).toContain('Mentor');
    expect(resolveToneDescription('Witty Challenger')).toContain('Witty Challenger');
    expect(resolveToneDescription('Curious Explorer')).toContain('Curious Explorer');
    expect(resolveToneDescription("Devil's Advocate")).toContain("Devil's Advocate");
  });

  test('resolveInquireAngle returns correct angle for DevilsAdvocate, Scaffolding, and multi-turn Socratic rotation', () => {
    expect(resolveInquireAngle('DevilsAdvocate', 0)).toContain('peer who disagrees constructively');
    expect(resolveInquireAngle('Scaffolding', 0)).toContain('scaffolding');

    // Socratic rotation across 4 facets
    const angle0 = resolveInquireAngle('Socratic', 0);
    const angle1 = resolveInquireAngle('Socratic', 2);
    const angle2 = resolveInquireAngle('Socratic', 4);
    const angle3 = resolveInquireAngle('Socratic', 6);

    expect(angle0).toContain('unstated assumptions');
    expect(angle1).toContain('credibility of the author');
    expect(angle2).toContain('quality of evidence');
    expect(angle3).toContain('missing perspectives');
  });

  test('buildSocraticSystemPrompt formats stage-specific templates for Conceptualise and Synthesis', () => {
    const conceptualiseSnapshot: ModuleSnapshot = {
      topicTitle: 'Climate Change',
      currentStage: 'conceptualise',
      notes: [{ highlightedText: 'rising seas', noteText: 'coastal risk' }],
      conceptNodes: [{ text: 'Thermal Expansion' }],
      conceptLinks: [{ fromText: 'Thermal Expansion', toText: 'Rising Seas' }],
      agentPersonality: 'Mentor',
    };
    const cPrompt = buildSocraticSystemPrompt(conceptualiseSnapshot);
    expect(cPrompt).toContain('Stage: Conceptualise');
    expect(cPrompt).toContain('Thermal Expansion');

    const synthesisSnapshot: ModuleSnapshot = {
      topicTitle: 'Climate Change',
      currentStage: 'synthesise',
      notes: [{ highlightedText: 'rising seas', noteText: 'coastal risk' }],
      conceptNodes: [{ text: 'Thermal Expansion' }],
      synthesisDraft: 'Human emissions drive extreme weather patterns.',
      agentPersonality: 'Mentor',
    };
    const sPrompt = buildSocraticSystemPrompt(synthesisSnapshot);
    expect(sPrompt).toContain('Stage: Synthesis');
    expect(sPrompt).toContain('Human emissions drive extreme weather patterns.');
    expect(sPrompt).toContain('Cross-check the conclusion against notes, concept map');
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

  test('generateAvatarHint nudges student to take notes if hintCount >= 3 and no notes taken in familiarise stage', async () => {
    const hint = await generateAvatarHint({
      stage: 'familiarise',
      topicTitle: 'Climate Change',
      sourceTitle: 'Social Media Post',
      sourceText: 'Cold winter invalidates global warming claims...',
      notes: [],
      hintCount: 3,
      agentPersonality: 'Friendly',
    });

    expect(hint.text).toBeDefined();
    // Fallback or LLM should nudge them to take notes
    expect(hint.text.toLowerCase()).toMatch(/note|highlight/);
    // Under 50 words
    const wordCount = hint.text.trim().split(/\s+/).length;
    expect(wordCount).toBeLessThan(50);
  });

  test('generateSocraticResponse and generateAvatarHint comply strictly with < 50 words ceiling', async () => {
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

    const [chatRes, hintRes] = await Promise.all([
      generateSocraticResponse(history, snapshot),
      generateAvatarHint({
        stage: 'conceptualise',
        topicTitle: 'Climate Change',
        conceptNodes: [{ text: 'Emissions' }],
        agentPersonality: 'Mentor',
      }),
    ]);

    expect(chatRes.text).toBeDefined();
    expect(hintRes.text).toBeDefined();

    const chatWords = chatRes.text.trim().split(/\s+/).length;
    const hintWords = hintRes.text.trim().split(/\s+/).length;

    expect(chatWords).toBeLessThan(50);
    expect(hintWords).toBeLessThan(50);
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
    // Should be a focused Socratic question (under 50 words, 1-2 sentences), not reciting every note
    const wordCount = hint.text.trim().split(/\s+/).length;
    expect(wordCount).toBeLessThan(50);
    expect(hint.text.split(/[.?!]+/).filter(Boolean).length).toBeLessThanOrEqual(4);
  });
});
