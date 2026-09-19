import { NextResponse } from 'next/server';
import { generateSocraticResponse, ChatTurn, ModuleSnapshot } from '@/domains/ai/aiService';
import { getNotesForModule } from '@/domains/notes/noteService';
import { getConceptualiseData } from '@/domains/concepts/conceptService';

export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const body = await request.json();
    const { history, userMessage, mode, agentPersonality, avatarName } = body;

    if (!userMessage || !userMessage.trim()) {
      return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
    }

    const currentHistory: ChatTurn[] = history || [];
    currentHistory.push({ sender: 'student', text: userMessage });

    // Fetch snapshot of notes and nodes
    const notesData = await getNotesForModule(params.moduleId);
    const conceptsData = await getConceptualiseData(params.moduleId);

    const snapshot: ModuleSnapshot = {
      topicTitle: 'Climate Change',
      currentStage: 'inquire',
      notes: notesData.map((n) => ({ highlightedText: n.highlightedText, noteText: n.noteText })),
      conceptNodes: conceptsData.nodes.map((n) => ({ text: n.text })),
      agentPersonality: agentPersonality || 'Socratic Peer',
      avatarName: avatarName || 'Aria',
    };

    const aiResult = await generateSocraticResponse(
      currentHistory,
      snapshot,
      mode === 'DevilsAdvocate' ? 'DevilsAdvocate' : 'Socratic'
    );

    const agentMessage: ChatTurn = {
      sender: 'agent',
      text: aiResult.text,
      messageType: mode === 'DevilsAdvocate' ? 'devils_advocate' : 'chat',
    };

    return NextResponse.json({
      success: true,
      message: agentMessage,
      provider: aiResult.provider,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process AI conversation' }, { status: 500 });
  }
}
