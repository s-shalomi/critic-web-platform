/**
 * Concepts Domain Service
 * Manages visual concept nodes, link relationships, canvas coordinates, node growth degree, and canvas state persistence.
 */

export interface ConceptNode {
  id: string;
  moduleId: string;
  text: string;
  positionX: number;
  positionY: number;
  sourceNoteId?: string;
  linkCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptLink {
  id: string;
  moduleId: string;
  fromNodeId: string;
  toNodeId: string;
  createdAt: string;
  updatedAt: string;
}

const memoryNodesStore = new Map<string, ConceptNode[]>();
const memoryLinksStore = new Map<string, ConceptLink[]>();

export async function getConceptualiseData(moduleId: string): Promise<{
  nodes: ConceptNode[];
  links: ConceptLink[];
}> {
  const nodes = memoryNodesStore.get(moduleId) || [
    {
      id: 'node-1',
      moduleId,
      text: 'record cold snow',
      positionX: 250,
      positionY: 120,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'node-2',
      moduleId,
      text: 'key concept',
      positionX: 220,
      positionY: 340,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'node-3',
      moduleId,
      text: 'key concept',
      positionX: 450,
      positionY: 200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const links = memoryLinksStore.get(moduleId) || [
    {
      id: 'link-1',
      moduleId,
      fromNodeId: 'node-1',
      toNodeId: 'node-2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'link-2',
      moduleId,
      fromNodeId: 'node-1',
      toNodeId: 'node-3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  if (!memoryNodesStore.has(moduleId)) {
    memoryNodesStore.set(moduleId, nodes);
    memoryLinksStore.set(moduleId, links);
  }

  // Calculate degree connection linkCount for each node
  const nodesWithDegree = nodes.map((node) => {
    const count = links.filter(
      (l) => l.fromNodeId === node.id || l.toNodeId === node.id
    ).length;
    return { ...node, linkCount: count };
  });

  return { nodes: nodesWithDegree, links };
}

export async function createConceptNode(data: {
  moduleId: string;
  text: string;
  positionX: number;
  positionY: number;
  sourceNoteId?: string;
}): Promise<ConceptNode> {
  const node: ConceptNode = {
    id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    moduleId: data.moduleId,
    text: data.text,
    positionX: data.positionX,
    positionY: data.positionY,
    sourceNoteId: data.sourceNoteId,
    linkCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existing = memoryNodesStore.get(data.moduleId) || [];
  existing.push(node);
  memoryNodesStore.set(data.moduleId, existing);

  return node;
}

export async function updateConceptNode(
  nodeId: string,
  data: { text?: string; positionX?: number; positionY?: number }
): Promise<ConceptNode | null> {
  for (const [moduleId, nodes] of memoryNodesStore.entries()) {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      if (data.text !== undefined) node.text = data.text;
      if (data.positionX !== undefined) node.positionX = data.positionX;
      if (data.positionY !== undefined) node.positionY = data.positionY;
      node.updatedAt = new Date().toISOString();
      memoryNodesStore.set(moduleId, nodes);
      return node;
    }
  }
  return null;
}

export async function deleteConceptNode(nodeId: string): Promise<boolean> {
  for (const [moduleId, nodes] of memoryNodesStore.entries()) {
    const index = nodes.findIndex((n) => n.id === nodeId);
    if (index !== -1) {
      nodes.splice(index, 1);
      memoryNodesStore.set(moduleId, nodes);

      // Remove attached links
      const links = memoryLinksStore.get(moduleId) || [];
      const updatedLinks = links.filter(
        (l) => l.fromNodeId !== nodeId && l.toNodeId !== nodeId
      );
      memoryLinksStore.set(moduleId, updatedLinks);

      return true;
    }
  }
  return false;
}

export async function createConceptLink(data: {
  moduleId: string;
  fromNodeId: string;
  toNodeId: string;
}): Promise<ConceptLink | null> {
  if (data.fromNodeId === data.toNodeId) return null;

  const existingLinks = memoryLinksStore.get(data.moduleId) || [];
  const duplicate = existingLinks.find(
    (l) =>
      (l.fromNodeId === data.fromNodeId && l.toNodeId === data.toNodeId) ||
      (l.fromNodeId === data.toNodeId && l.toNodeId === data.fromNodeId)
  );

  if (duplicate) return duplicate;

  const link: ConceptLink = {
    id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    moduleId: data.moduleId,
    fromNodeId: data.fromNodeId,
    toNodeId: data.toNodeId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  existingLinks.push(link);
  memoryLinksStore.set(data.moduleId, existingLinks);

  return link;
}

export async function deleteConceptLink(linkId: string): Promise<boolean> {
  for (const [moduleId, links] of memoryLinksStore.entries()) {
    const index = links.findIndex((l) => l.id === linkId);
    if (index !== -1) {
      links.splice(index, 1);
      memoryLinksStore.set(moduleId, links);
      return true;
    }
  }
  return false;
}
