import { NextResponse } from 'next/server';
import { generateSocraticResponse, ModuleSnapshot, ChatTurn } from '@/domains/ai/aiService';
import { getNotesForModule } from '@/domains/notes/noteService';
import { getConceptualiseData } from '@/domains/concepts/conceptService';
import { resolveTopicContextForModule } from '@/domains/topics/topicService';

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
    const { synthesisText, agentPersonality, avatarName } = body;

    if (!synthesisText || !synthesisText.trim()) {
      return NextResponse.json({ error: 'synthesisText is required' }, { status: 400 });
    }

    memorySynthesisStore.set(params.moduleId, synthesisText);

    // Fetch snapshot of prior stage notes, nodes, and dynamic topic context for cross-checking
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

    const snapshot: ModuleSnapshot = {
      topicTitle: topicCtx.topicTitle,
      currentStage: 'synthesise',
      notes: resolvedNotes,
      conceptNodes: rawNodes.map((n) => ({ text: String(n.text || '') })),
      conceptLinks: resolvedLinks,
      sources: topicCtx.sources,
      synthesisDraft: synthesisText,
      agentPersonality: agentPersonality || 'Friendly',
      avatarName: avatarName || 'Aria',
    };

    const priorChatHistory: ChatTurn[] = Array.isArray(body.chatHistory)
      ? body.chatHistory
          .filter((m: any) => m && (m.sender === 'student' || m.sender === 'agent') && m.text)
          .map((m: any) => ({
            sender: m.sender,
            text: String(m.text),
          }))
      : [];

    const crossCheckHistory: ChatTurn[] = [
      ...priorChatHistory,
      {
        sender: 'student' as const,
        text: `Here is my draft synthesis of the ${topicCtx.topicTitle} module:\n\n${synthesisText}\n\nPlease cross-check this against my notes, visual concept map, and our inquiry discussion. What missing links or unaddressed counterarguments should I consider?`,
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
