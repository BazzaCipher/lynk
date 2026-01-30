import type { Edge } from '@xyflow/react';
import type { LynkNode } from '../../types';

export interface LayoutOptions {
  horizontalSpacing: number;
  verticalSpacing: number;
  startX: number;
  startY: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  horizontalSpacing: 350,
  verticalSpacing: 150,
  startX: 50,
  startY: 50,
};

// Source nodes always start on the left
const SOURCE_TYPES = new Set(['extractor', 'display']);
// Sink types - nodes typically used as outputs, placed further right when disconnected
const SINK_TYPES = new Set(['label']);

/**
 * Compute node depths based on edge dependencies.
 * Source nodes (extractor, display) are always depth 0.
 * Sink nodes (label) without connections go to max depth.
 * Other nodes' depth is max(depth of all sources) + 1.
 */
function computeNodeDepths(
  nodes: LynkNode[],
  edges: Edge[]
): Map<string, number> {
  const depths = new Map<string, number>();
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build adjacency maps
  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();
  for (const node of nodes) {
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
  }
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      incomingEdges.get(edge.target)?.push(edge.source);
      outgoingEdges.get(edge.source)?.push(edge.target);
    }
  }

  // Identify nodes by connectivity
  const disconnectedSinks: string[] = [];
  const roots: string[] = [];

  for (const node of nodes) {
    const incoming = incomingEdges.get(node.id) || [];
    const outgoing = outgoingEdges.get(node.id) || [];
    const isDisconnected = incoming.length === 0 && outgoing.length === 0;

    if (SOURCE_TYPES.has(node.type)) {
      // Source types always at depth 0
      roots.push(node.id);
      depths.set(node.id, 0);
    } else if (SINK_TYPES.has(node.type) && isDisconnected) {
      // Disconnected sinks - will be placed at max depth later
      disconnectedSinks.push(node.id);
    } else if (incoming.length === 0) {
      // Other nodes with no incoming edges start at depth 0
      roots.push(node.id);
      depths.set(node.id, 0);
    }
  }

  // BFS to compute depths for connected nodes
  const queue = [...roots];
  const visited = new Set<string>(roots);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current) ?? 0;

    const targets = outgoingEdges.get(current) || [];
    for (const target of targets) {
      const existingDepth = depths.get(target);
      const newDepth = currentDepth + 1;

      // Update depth if this path gives a greater depth
      if (existingDepth === undefined || newDepth > existingDepth) {
        depths.set(target, newDepth);
      }

      if (!visited.has(target)) {
        visited.add(target);
        queue.push(target);
      }
    }
  }

  // Find max depth for disconnected sinks
  let maxDepth = 0;
  for (const depth of depths.values()) {
    if (depth > maxDepth) maxDepth = depth;
  }

  // Place disconnected sinks at max depth (or 1 if no other nodes)
  const sinkDepth = Math.max(maxDepth, 1);
  for (const nodeId of disconnectedSinks) {
    depths.set(nodeId, sinkDepth);
  }

  // Handle any remaining disconnected nodes
  for (const node of nodes) {
    if (!depths.has(node.id)) {
      depths.set(node.id, 0);
    }
  }

  return depths;
}

/**
 * Tree-based layout: arranges nodes in columns based on dependency depth.
 * Extractor/display nodes on the left, downstream nodes in subsequent columns.
 */
export function applyTreeLayout(
  nodes: LynkNode[],
  edges: Edge[],
  options: Partial<LayoutOptions> = {}
): LynkNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip group nodes in layout - they're containers
  const layoutNodes = nodes.filter((n) => n.type !== 'group');
  const groupNodes = nodes.filter((n) => n.type === 'group');

  if (layoutNodes.length === 0) {
    return nodes;
  }

  // Compute depths
  const depths = computeNodeDepths(layoutNodes, edges);

  // Group nodes by depth
  const nodesByDepth = new Map<number, LynkNode[]>();
  for (const node of layoutNodes) {
    const depth = depths.get(node.id) ?? 0;
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, []);
    }
    nodesByDepth.get(depth)!.push(node);
  }

  // Sort depths and position nodes
  const sortedDepths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);

  const newPositions = new Map<string, { x: number; y: number }>();

  for (const depth of sortedDepths) {
    const nodesAtDepth = nodesByDepth.get(depth)!;

    // Sort nodes at this depth by their original y position for stability
    nodesAtDepth.sort((a, b) => a.position.y - b.position.y);

    const x = opts.startX + depth * opts.horizontalSpacing;

    for (let i = 0; i < nodesAtDepth.length; i++) {
      const node = nodesAtDepth[i];
      const y = opts.startY + i * opts.verticalSpacing;
      newPositions.set(node.id, { x, y });
    }
  }

  // Apply new positions
  return nodes.map((node) => {
    const newPos = newPositions.get(node.id);
    if (newPos && !node.parentId) {
      return { ...node, position: newPos };
    }
    return node;
  }).concat(
    // Keep group nodes but they may need repositioning based on children
    groupNodes.filter((g) => !newPositions.has(g.id))
  );
}

/**
 * Grid layout: arranges all nodes in a simple grid pattern.
 */
export function applyGridLayout(
  nodes: LynkNode[],
  _edges: Edge[],
  options: Partial<LayoutOptions & { columns?: number }> = {}
): LynkNode[] {
  const opts = { ...DEFAULT_OPTIONS, columns: 4, ...options };

  const layoutNodes = nodes.filter((n) => n.type !== 'group' && !n.parentId);

  if (layoutNodes.length === 0) {
    return nodes;
  }

  const newPositions = new Map<string, { x: number; y: number }>();

  for (let i = 0; i < layoutNodes.length; i++) {
    const node = layoutNodes[i];
    const col = i % opts.columns;
    const row = Math.floor(i / opts.columns);
    const x = opts.startX + col * opts.horizontalSpacing;
    const y = opts.startY + row * opts.verticalSpacing;
    newPositions.set(node.id, { x, y });
  }

  return nodes.map((node) => {
    const newPos = newPositions.get(node.id);
    if (newPos) {
      return { ...node, position: newPos };
    }
    return node;
  });
}

export type LayoutType = 'tree' | 'grid';

export function applyLayout(
  nodes: LynkNode[],
  edges: Edge[],
  layoutType: LayoutType,
  options?: Partial<LayoutOptions>
): LynkNode[] {
  switch (layoutType) {
    case 'tree':
      return applyTreeLayout(nodes, edges, options);
    case 'grid':
      return applyGridLayout(nodes, edges, options);
    default:
      return nodes;
  }
}
