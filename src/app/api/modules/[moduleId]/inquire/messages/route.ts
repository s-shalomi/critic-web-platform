import { NextResponse } from 'next/server';
import { generateSocraticResponse, resolveInquireAngle, ChatTurn, ModuleSnapshot, AgentMode } from '@/domains/ai/aiService';
import { getNotesForModule } from '@/domains/notes/noteService';
import { getConceptualiseData } from '@/domains/concepts/conceptService';
import { resolveTopicContextForModule } from '@/domains/topics/topicService';

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

    const currentHistory: ChatTurn[] = Array.isArray(history) ? [...history] : [];
    currentHistory.push({ sender: 'student', text: userMessage });

    // Fetch snapshot of notes, nodes, and dynamic topic context
    const [notesData, conceptsData, topicCtx] = await Promise.all([
      getNotesForModule(params.moduleId),
      getConceptualiseData(params.moduleId),
      resolveTopicContextForModule(params.moduleId),
    ]);

    const resolvedNotes = Array.isArray(body.notes) && body.notes.length > 0
      ? body.notes.map((n: any) => ({
          highlightedText: String(n.highlightedText || ''),
          noteText: String(n.noteText || ''),
        }))
      : notesData.map((n) => ({ highlightedText: n.highlightedText, noteText: n.noteText }));

    const rawNodes: Array<{ id?: string; text: string }> =
      Array.isArray(body.conceptNodes) && body.conceptNodes.length > 0
        ? body.conceptNodes
        : conceptsData.nodes.map((n) => ({ id: n.id, text: n.text }));

    const nodeMap = new Map<string, string>();
    rawNodes.forEach((n) => {
      if (n.id) nodeMap.set(n.id, String(n.text || ''));
    });

    const rawLinks = Array.isArray(body.conceptLinks) && body.conceptLinks.length > 0
      ? body.conceptLinks
      : conceptsData.links;

    const resolvedLinks = rawLinks
      .map((l: any) => {
        if (l.fromText && l.toText) {
          return { fromText: String(l.fromText), toText: String(l.toText) };
        }
        const fromText = nodeMap.get(l.fromNodeId);
        const toText = nodeMap.get(l.toNodeId);
        return fromText && toText ? { fromText, toText } : null;
      })
      .filter(Boolean) as Array<{ fromText: string; toText: string }>;

    const resolvedMode: AgentMode =
      mode === 'DevilsAdvocate'
        ? 'DevilsAdvocate'
        : mode === 'Scaffolding'
        ? 'Scaffolding'
        : 'Socratic';

    const angle = resolveInquireAngle(resolvedMode, currentHistory.length);

    const snapshot: ModuleSnapshot = {
      topicTitle: topicCtx.topicTitle,
      currentStage: 'inquire',
      notes: resolvedNotes,
      conceptNodes: rawNodes.map((n) => ({ text: String(n.text || '') })),
      conceptLinks: resolvedLinks,
      sources: topicCtx.sources,
      agentPersonality: agentPersonality || 'Friendly',
      avatarName: avatarName || 'Aria',
      angle,
    };

    const aiResult = await generateSocraticResponse(
      currentHistory,
      snapshot,
      resolvedMode
    );

    const agentMessage: ChatTurn = {
      sender: 'agent',
      text: aiResult.text,
      messageType: resolvedMode === 'DevilsAdvocate' ? 'devils_advocate' : 'chat',
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
