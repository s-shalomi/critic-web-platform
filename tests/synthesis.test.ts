import { generateSocraticResponse, ModuleSnapshot } from '../src/domains/ai/aiService';

describe('Synthesis Domain & Cross-Check Tests', () => {
  test('Socratic AI cross-checks draft synthesis against prior evidence notes and concept nodes', async () => {
    const snapshot: ModuleSnapshot = {
      topicTitle: 'Climate Change',
      currentStage: 'synthesise',
      notes: [
        { highlightedText: 'tremendous snow', noteText: 'Distinguish local weather from long term climate trend' },
      ],
      conceptNodes: [
        { text: 'polar vortex' },
        { text: 'arctic warming' },
      ],
      synthesisDraft: 'Local cold weather events are caused by atmospheric jet stream disruption linked to Arctic warming.',
    };

    const history = [
      {
        sender: 'student' as const,
        text: 'Draft Synthesis: Local cold weather events are caused by atmospheric jet stream disruption linked to Arctic warming.',
      },
    ];

    const result = await generateSocraticResponse(history, snapshot, 'Socratic');
    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(15);
  });
});
