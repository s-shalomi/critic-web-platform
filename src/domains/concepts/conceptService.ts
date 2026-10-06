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

import { conceptNodesStore, conceptLinksStore, notesStore } from '@/shared/db/sessionStore';
import { revertNoteConvertedToNode } from '../notes/noteService';

export async function getConceptualiseData(moduleId: string): Promise<{
  nodes: ConceptNode[];
  links: ConceptLink[];
}> {
  // Start with empty nodes/links if not present (no hardcoded mockup example nodes)
  const nodes = (conceptNodesStore.get(moduleId) as ConceptNode[]) || [];
  let links = (conceptLinksStore.get(moduleId) as ConceptLink[]) || [];

  if (!conceptNodesStore.has(moduleId)) {
    conceptNodesStore.set(moduleId, nodes);
    conceptLinksStore.set(moduleId, links);
  }

  // Always filter out any orphaned links whose endpoints no longer exist
  const validNodeIds = new Set(nodes.map((n) => n.id));
  links = links.filter((l) => validNodeIds.has(l.fromNodeId) && validNodeIds.has(l.toNodeId));
  conceptLinksStore.set(moduleId, links);

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

  const existing = (conceptNodesStore.get(data.moduleId) as ConceptNode[]) || [];
  existing.push(node);
  conceptNodesStore.set(data.moduleId, existing);

  return node;
}

export async function updateConceptNode(
  nodeId: string,
  data: { text?: string; positionX?: number; positionY?: number }
): Promise<ConceptNode | null> {
  for (const [moduleId, nodes] of conceptNodesStore.entries()) {
    const node = (nodes as ConceptNode[]).find((n) => n.id === nodeId);
    if (node) {
      if (data.text !== undefined) node.text = data.text;
      if (data.positionX !== undefined) node.positionX = data.positionX;
      if (data.positionY !== undefined) node.positionY = data.positionY;
      node.updatedAt = new Date().toISOString();
      conceptNodesStore.set(moduleId, nodes);
      return node;
    }
  }
  return null;
}

export async function deleteConceptNode(nodeId: string): Promise<boolean> {
  let found = false;

  // 1. Remove the node from any module's node list
  for (const [moduleId, nodes] of conceptNodesStore.entries()) {
    const typedNodes = nodes as ConceptNode[];
    const index = typedNodes.findIndex((n) => n.id === nodeId);
    if (index !== -1) {
      const [deletedNode] = typedNodes.splice(index, 1);
      conceptNodesStore.set(moduleId, typedNodes);
      found = true;

      // Revert convertedToNode on associated note in familiarise stage
      if (deletedNode.sourceNoteId) {
        await revertNoteConvertedToNode(deletedNode.sourceNoteId);
      } else {
        // Fallback: match note by text content across modules
        for (const [modId, nList] of notesStore.entries()) {
          const notesArr = nList as any[];
          notesArr.forEach((n) => {
            if (n.noteText === deletedNode.text || n.highlightedText === deletedNode.text) {
              n.convertedToNode = false;
              n.updatedAt = new Date().toISOString();
            }
          });
          notesStore.set(modId, notesArr);
        }
      }
    }
  }

  // 2. ALWAYS purge all connected links across all modules
  for (const [moduleId, links] of conceptLinksStore.entries()) {
    const typedLinks = links as ConceptLink[];
    const remainingLinks = typedLinks.filter(
      (l) => l.fromNodeId !== nodeId && l.toNodeId !== nodeId
    );
    if (remainingLinks.length !== typedLinks.length) {
      conceptLinksStore.set(moduleId, remainingLinks);
      found = true;
    }
  }

  return found;
}

export async function createConceptLink(data: {
  moduleId: string;
  fromNodeId: string;
  toNodeId: string;
}): Promise<ConceptLink | null> {
  if (data.fromNodeId === data.toNodeId) return null;

  const existingLinks = (conceptLinksStore.get(data.moduleId) as ConceptLink[]) || [];
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
  conceptLinksStore.set(data.moduleId, existingLinks);

  return link;
}

export async function deleteConceptLink(linkId: string): Promise<boolean> {
  for (const [moduleId, links] of conceptLinksStore.entries()) {
    const typedLinks = links as ConceptLink[];
    const index = typedLinks.findIndex((l) => l.id === linkId);
    if (index !== -1) {
      typedLinks.splice(index, 1);
      conceptLinksStore.set(moduleId, typedLinks);
      return true;
    }
  }
  return false;
}
