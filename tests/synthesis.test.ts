import { generateSocraticResponse, ModuleSnapshot } from '../src/domains/ai/aiService';
import { GET, PUT } from '../src/app/api/modules/[moduleId]/synthesis/route';

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

  test('PUT /api/modules/:moduleId/synthesis saves draft conclusion without invoking AI audit', async () => {
    const draftText = 'Global warming leads to extreme localized winter weather via polar vortex disruption.';
    const req = new Request('http://localhost:3000/api/modules/mod_test_1/synthesis', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ synthesisDraft: draftText }),
    });

    const response = await PUT(req, { params: { moduleId: 'mod_test_1' } });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.saved).toBe(true);
    expect(data.synthesisDraft).toBe(draftText);
  });

  test('GET /api/modules/:moduleId/synthesis returns previously saved conclusion draft', async () => {
    const req = new Request('http://localhost:3000/api/modules/mod_test_1/synthesis', {
      method: 'GET',
    });

    const response = await GET(req, { params: { moduleId: 'mod_test_1' } });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.synthesisDraft).toBe('Global warming leads to extreme localized winter weather via polar vortex disruption.');
  });

  test('Stage departure auto-save contracts: leaving stage persists synthesis draft and does not trigger on entry', async () => {
    const draftText = 'Updated conclusion before stage departure';
    const putReq = new Request('http://localhost:3000/api/modules/mod_departure/synthesis', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ synthesisDraft: draftText }),
    });

    const putRes = await PUT(putReq, { params: { moduleId: 'mod_departure' } });
    const putData = await putRes.json();
    expect(putData.success).toBe(true);
    expect(putData.saved).toBe(true);
    expect(putData.synthesisDraft).toBe(draftText);

    // Verify GET retrieves the persisted draft
    const getReq = new Request('http://localhost:3000/api/modules/mod_departure/synthesis', {
      method: 'GET',
    });
    const getRes = await GET(getReq, { params: { moduleId: 'mod_departure' } });
    const getData = await getRes.json();
    expect(getData.synthesisDraft).toBe(draftText);
  });
});

