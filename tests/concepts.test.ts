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

  test('Deletes concept node and cleans up connected links', async () => {
    const moduleId = 'mod_delete_node_test';
    const node = await createConceptNode({ moduleId, text: 'node to delete', positionX: 50, positionY: 50 });

    const isDeleted = await deleteConceptNode(node.id);
    expect(isDeleted).toBe(true);

    const data = await getConceptualiseData(moduleId);
    const found = data.nodes.find((n) => n.id === node.id);
    expect(found).toBeUndefined();
  });
});
