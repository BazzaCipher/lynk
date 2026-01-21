import type { Edge } from '@xyflow/react';

/**
 * Check if adding an edge would create a circular dependency.
 * Uses depth-first search to detect cycles in the graph.
 */
export function wouldCreateCycle(
  edges: Edge[],
  newSource: string,
  newTarget: string
): boolean {
  // Build adjacency list from existing edges
  const adjacency = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, new Set());
    }
    adjacency.get(edge.source)!.add(edge.target);
  }

  // Add the new edge temporarily
  if (!adjacency.has(newSource)) {
    adjacency.set(newSource, new Set());
  }
  adjacency.get(newSource)!.add(newTarget);

  // DFS to detect cycle starting from newTarget
  // If we can reach newSource from newTarget, there's a cycle
  const visited = new Set<string>();
  const stack = [newTarget];

  while (stack.length > 0) {
    const node = stack.pop()!;

    if (node === newSource) {
      return true; // Found cycle
    }

    if (visited.has(node)) {
      continue;
    }
    visited.add(node);

    const neighbors = adjacency.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }
  }

  return false;
}

/**
 * Get the topological order of nodes for data flow processing.
 * Returns null if there's a cycle.
 */
export function getTopologicalOrder(
  nodeIds: string[],
  edges: Edge[]
): string[] | null {
  // Build adjacency list and in-degree count
  const adjacency = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, new Set());
    inDegree.set(nodeId, 0);
  }

  for (const edge of edges) {
    if (adjacency.has(edge.source) && inDegree.has(edge.target)) {
      adjacency.get(edge.source)!.add(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  const result: string[] = [];

  // Start with nodes that have no incoming edges
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    for (const neighbor of adjacency.get(node) || []) {
      const newDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If we didn't process all nodes, there's a cycle
  if (result.length !== nodeIds.length) {
    return null;
  }

  return result;
}

/**
 * Get all nodes that depend on the given source node.
 */
export function getDependentNodes(edges: Edge[], sourceNodeId: string): string[] {
  const dependents = new Set<string>();
  const stack = [sourceNodeId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);

    for (const edge of edges) {
      if (edge.source === node && !dependents.has(edge.target)) {
        dependents.add(edge.target);
        stack.push(edge.target);
      }
    }
  }

  return Array.from(dependents);
}
