import { NextResponse } from 'next/server';
import { generateAvatarHint } from '@/domains/ai/aiService';
import { getNotesForModule } from '@/domains/notes/noteService';
import { getConceptualiseData } from '@/domains/concepts/conceptService';

export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const stage = body.stage || 'familiarise';
    const sourceTitle = body.sourceTitle;
    const sourceText = body.sourceText;
    const agentPersonality = body.agentPersonality;
    const avatarName = body.avatarName;

    // Retrieve active module notes and concept nodes
    const notesData = await getNotesForModule(params.moduleId);
    const conceptsData = await getConceptualiseData(params.moduleId);

    const hintResult = await generateAvatarHint({
      stage,
      topicTitle: 'Climate Change',
      sourceTitle,
      sourceText,
      notes: notesData.map((n) => ({
        highlightedText: n.highlightedText,
        noteText: n.noteText,
      })),
      conceptNodes: conceptsData.nodes.map((n) => ({ text: n.text })),
      agentPersonality,
      avatarName,
    });

    return NextResponse.json({
      success: true,
      hint: hintResult.text,
      provider: hintResult.provider,
      agentName: avatarName || 'Aria',
      personality: agentPersonality || 'Socratic Peer',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate agent hint' }, { status: 500 });
  }
}
