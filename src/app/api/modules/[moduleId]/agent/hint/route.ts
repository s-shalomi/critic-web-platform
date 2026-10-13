import { NextResponse } from 'next/server';
import { generateAvatarHint } from '@/domains/ai/aiService';
import { getNotesForModule } from '@/domains/notes/noteService';
import { getConceptualiseData } from '@/domains/concepts/conceptService';
import { resolveTopicContextForModule } from '@/domains/topics/topicService';

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
    const hintCount = typeof body.hintCount === 'number' ? body.hintCount : 0;

    // Retrieve active module notes, concept nodes, and dynamic topic context
    const [notesData, conceptsData, topicCtx] = await Promise.all([
      getNotesForModule(params.moduleId),
      getConceptualiseData(params.moduleId),
      resolveTopicContextForModule(params.moduleId),
    ]);

    // Prefer client's real-time notes if provided, otherwise fall back to server store
    const resolvedNotes = Array.isArray(body.notes) && body.notes.length > 0
      ? body.notes.map((n: any) => ({
          highlightedText: String(n.highlightedText || ''),
          noteText: String(n.noteText || ''),
        }))
      : notesData.map((n) => ({
          highlightedText: n.highlightedText,
          noteText: n.noteText,
        }));

    // Prefer client's real-time canvas concept nodes if provided
    const rawNodes: Array<{ id?: string; text: string }> =
      Array.isArray(body.conceptNodes) && body.conceptNodes.length > 0
        ? body.conceptNodes
        : conceptsData.nodes.map((n) => ({ id: n.id, text: n.text }));

    const conceptNodes = rawNodes.map((n) => ({ text: String(n.text || '') }));

    const rawLinks = Array.isArray(body.conceptLinks) && body.conceptLinks.length > 0
      ? body.conceptLinks
      : conceptsData.links;

    const isFamiliarise = stage === 'familiarise';

    const hintResult = await generateAvatarHint({
      stage,
      topicTitle: topicCtx.topicTitle,
      sourceTitle,
      sourceText,
      notes: resolvedNotes,
      conceptNodes: isFamiliarise ? [] : conceptNodes,
      conceptLinks: isFamiliarise ? [] : rawLinks,
      agentPersonality,
      avatarName,
      hintCount,
    });

    return NextResponse.json({
      success: true,
      hint: hintResult.text,
      provider: hintResult.provider,
      agentName: avatarName || 'Aria',
      personality: agentPersonality || 'Friendly',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate agent hint' }, { status: 500 });
  }
}
