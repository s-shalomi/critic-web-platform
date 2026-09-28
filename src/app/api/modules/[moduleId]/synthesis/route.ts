import { NextResponse } from 'next/server';
import { generateSocraticResponse, ModuleSnapshot } from '@/domains/ai/aiService';
import { getNotesForModule } from '@/domains/notes/noteService';
import { getConceptualiseData } from '@/domains/concepts/conceptService';

let memorySynthesisStore = new Map<string, string>();

export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const draft = memorySynthesisStore.get(params.moduleId) || '';
    return NextResponse.json({ success: true, synthesisDraft: draft });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch synthesis draft' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const body = await request.json();
    const { synthesisText } = body;

    if (!synthesisText || !synthesisText.trim()) {
      return NextResponse.json({ error: 'synthesisText is required' }, { status: 400 });
    }

    memorySynthesisStore.set(params.moduleId, synthesisText);

    // Fetch snapshot of prior stage notes and nodes for cross-checking
    const notesData = await getNotesForModule(params.moduleId);
    const conceptsData = await getConceptualiseData(params.moduleId);

    const snapshot: ModuleSnapshot = {
      topicTitle: 'Climate Change',
      currentStage: 'synthesise',
      notes: notesData.map((n) => ({ highlightedText: n.highlightedText, noteText: n.noteText })),
      conceptNodes: conceptsData.nodes.map((n) => ({ text: n.text })),
      synthesisDraft: synthesisText,
    };

    const crossCheckHistory = [
      {
        sender: 'student' as const,
        text: `Here is my draft synthesis of the climate change module:\n\n${synthesisText}\n\nPlease cross-check this against my notes and visual map. What missing links or unaddressed counterarguments should I consider?`,
      },
    ];

    const aiFeedback = await generateSocraticResponse(crossCheckHistory, snapshot, 'Socratic');

    return NextResponse.json({
      success: true,
      synthesisDraft: synthesisText,
      feedback: aiFeedback.text,
      provider: aiFeedback.provider,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cross-check synthesis' }, { status: 500 });
  }
}
