import {
  getConceptualiseData,
  createConceptNode,
  updateConceptNode,
  deleteConceptNode,
  createConceptLink,
} from '../src/domains/concepts/conceptService';
import { convertNoteToNode, createNote } from '../src/domains/notes/noteService';

describe('Concepts Domain & Note Conversion Tests', () => {
  test('getConceptualiseData starts clean without hardcoded dummy nodes', async () => {
    const moduleId = 'mod_clean_canvas_test';
    const data = await getConceptualiseData(moduleId);
    expect(data.nodes).toEqual([]);
    expect(data.links).toEqual([]);
  });

  test('convertNoteToNode automatically generates a Concept Node in concept store', async () => {
    const moduleId = 'mod_convert_test';
    const note = await createNote({
      moduleId,
      sourceId: 'source-1',
      highlightedText: 'polar vortex',
      noteText: 'Polar vortex instability caused by Arctic warming',
    });

    const result = await convertNoteToNode(note.id);
    expect(result.success).toBe(true);
    expect(result.conceptNode).toBeDefined();
    expect(result.conceptNode?.text).toBe('Polar vortex instability caused by Arctic warming');

    const data = await getConceptualiseData(moduleId);
    const nodeInStore = data.nodes.find((n) => n.id === result.conceptNode?.id);
    expect(nodeInStore).toBeDefined();
  });

  test('Updates concept node text and position coordinates', async () => {
    const moduleId = 'mod_update_node_test';
    const node = await createConceptNode({
      moduleId,
      text: 'jet stream disruption',
      positionX: 100,
      positionY: 100,
    });

    const updated = await updateConceptNode(node.id, { text: 'jet stream disruption (edited)', positionX: 450, positionY: 550 });
    expect(updated?.text).toBe('jet stream disruption (edited)');
    expect(updated?.positionX).toBe(450);
  });

  test('Deletes concept node, cleans up connected links, and reverts note convertedToNode', async () => {
    const moduleId = 'mod_delete_node_links_test';
    const note = await createNote({
      moduleId,
      sourceId: 'source-test',
      highlightedText: 'arctic amplification',
      noteText: 'Arctic warming faster than rest of globe',
    });

    const convResult = await convertNoteToNode(note.id);
    expect(convResult.success).toBe(true);
    const nodeA = convResult.conceptNode!;

    const nodeB = await createConceptNode({
      moduleId,
      text: 'extreme winter weather',
      positionX: 300,
      positionY: 300,
    });

    const link = await createConceptLink({
      moduleId,
      fromNodeId: nodeA.id,
      toNodeId: nodeB.id,
    });
    expect(link).toBeDefined();

    // Verify initial state: 2 nodes, 1 link
    const beforeData = await getConceptualiseData(moduleId);
    expect(beforeData.nodes.length).toBe(2);
    expect(beforeData.links.length).toBe(1);

    // Delete nodeA
    const isDeleted = await deleteConceptNode(nodeA.id);
    expect(isDeleted).toBe(true);

    // Verify nodeA and its connecting link are both completely gone
    const afterData = await getConceptualiseData(moduleId);
    expect(afterData.nodes.find((n) => n.id === nodeA.id)).toBeUndefined();
    expect(afterData.links.find((l) => l.fromNodeId === nodeA.id || l.toNodeId === nodeA.id)).toBeUndefined();
    expect(afterData.links.length).toBe(0);

    // Verify the original note has reverted convertedToNode back to false
    const notesInModule = (await import('../src/domains/notes/noteService')).getNotesForModule;
    const notes = await notesInModule(moduleId);
    const foundNote = notes.find((n) => n.id === note.id);
    expect(foundNote?.convertedToNode).toBe(false);
  });
});

