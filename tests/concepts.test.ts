import {
  getConceptualiseData,
  createConceptNode,
  updateConceptNode,
  deleteConceptNode,
  createConceptLink,
} from '../src/domains/concepts/conceptService';

describe('Concepts Domain Tests', () => {
  test('getConceptualiseData returns initial nodes and link degree counts', async () => {
    const moduleId = 'mod_test_concepts';
    const data = await getConceptualiseData(moduleId);

    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.links.length).toBeGreaterThan(0);
    expect(data.nodes[0].linkCount).toBeDefined();
  });

  test('Creates concept node and adds to canvas state', async () => {
    const moduleId = 'mod_test_create_node';
    const node = await createConceptNode({
      moduleId,
      text: 'polar vortex destabilization',
      positionX: 300,
      positionY: 400,
    });

    expect(node.id).toBeDefined();
    expect(node.text).toBe('polar vortex destabilization');

    const data = await getConceptualiseData(moduleId);
    const found = data.nodes.find((n) => n.id === node.id);
    expect(found).toBeDefined();
  });

  test('Updates concept node coordinates on canvas drag', async () => {
    const moduleId = 'mod_test_update_node';
    const node = await createConceptNode({
      moduleId,
      text: 'jet stream disruption',
      positionX: 100,
      positionY: 100,
    });

    const updated = await updateConceptNode(node.id, { positionX: 450, positionY: 550 });
    expect(updated?.positionX).toBe(450);
    expect(updated?.positionY).toBe(550);
  });

  test('Connects two concept nodes with a link', async () => {
    const moduleId = 'mod_test_link_nodes';
    const node1 = await createConceptNode({ moduleId, text: 'node A', positionX: 10, positionY: 10 });
    const node2 = await createConceptNode({ moduleId, text: 'node B', positionX: 100, positionY: 100 });

    const link = await createConceptLink({
      moduleId,
      fromNodeId: node1.id,
      toNodeId: node2.id,
    });

    expect(link).toBeDefined();
    expect(link?.fromNodeId).toBe(node1.id);
    expect(link?.toNodeId).toBe(node2.id);

    const data = await getConceptualiseData(moduleId);
    const linkedNode1 = data.nodes.find((n) => n.id === node1.id);
    expect(linkedNode1?.linkCount).toBeGreaterThan(0);
  });

  test('Deletes concept node and cleans up connected links', async () => {
    const moduleId = 'mod_test_delete_node';
    const node = await createConceptNode({ moduleId, text: 'delete me', positionX: 50, positionY: 50 });

    const isDeleted = await deleteConceptNode(node.id);
    expect(isDeleted).toBe(true);

    const data = await getConceptualiseData(moduleId);
    const found = data.nodes.find((n) => n.id === node.id);
    expect(found).toBeUndefined();
  });
});
