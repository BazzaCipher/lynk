/**
 * Group Slice
 *
 * Handles node grouping and selection operations:
 * - Creating groups from selected nodes
 * - Ungrouping nodes
 * - Selection queries and operations
 */

import type { Edge } from '@xyflow/react';
import type { LynkNode } from '../../types';
import type { StateCreator } from './types';
import { generateNodeId } from './coreSlice';

export interface GroupSlice {
  // Group actions
  createGroup: (nodeIds: string[]) => string | null;
  ungroupNodes: (groupId: string) => void;

  // Selection queries
  getSelectedNodes: () => LynkNode[];
  getSelectedEdges: () => Edge[];

  // Selection actions
  removeSelectedNodes: () => void;
  removeSelectedEdges: () => void;
  clearSelection: () => void;
}

export const createGroupSlice: StateCreator<GroupSlice> = (set, get) => ({
  createGroup: (nodeIds) => {
    const { nodes } = get();
    const selectedNodes = nodes.filter((n) => nodeIds.includes(n.id) && n.type !== 'group');

    if (selectedNodes.length < 2) return null;

    // Calculate bounding box of selected nodes
    const padding = 20;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const node of selectedNodes) {
      const x = node.position.x;
      const y = node.position.y;
      // Estimate node dimensions (default to 200x100 if unknown)
      const width = (node as { width?: number }).width ?? 200;
      const height = (node as { height?: number }).height ?? 100;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }

    const groupId = generateNodeId();
    const groupPosition = { x: minX - padding, y: minY - padding };
    const groupWidth = maxX - minX + padding * 2;
    const groupHeight = maxY - minY + padding * 2;

    // Create group node
    const groupNode: LynkNode = {
      id: groupId,
      type: 'group',
      position: groupPosition,
      data: {
        label: 'Group',
        width: groupWidth,
        height: groupHeight,
      },
    } as LynkNode;

    // Update selected nodes to have parentId and relative positions
    const updatedNodes = nodes.map((node) => {
      if (nodeIds.includes(node.id) && node.type !== 'group') {
        return {
          ...node,
          parentId: groupId,
          position: {
            x: node.position.x - groupPosition.x,
            y: node.position.y - groupPosition.y,
          },
        };
      }
      return node;
    });

    set({ nodes: [groupNode, ...updatedNodes] as LynkNode[] });
    return groupId;
  },

  ungroupNodes: (groupId) => {
    const { nodes } = get();
    const groupNode = nodes.find((n) => n.id === groupId && n.type === 'group');
    if (!groupNode) return;

    const groupPosition = groupNode.position;

    // Update children to have absolute positions and remove parentId
    const updatedNodes = nodes
      .filter((n) => n.id !== groupId)
      .map((node) => {
        if (node.parentId === groupId) {
          const { parentId: _parentId, ...rest } = node as LynkNode & { parentId?: string };
          return {
            ...rest,
            position: {
              x: node.position.x + groupPosition.x,
              y: node.position.y + groupPosition.y,
            },
          };
        }
        return node;
      });

    set({ nodes: updatedNodes as LynkNode[] });
  },

  getSelectedNodes: () => {
    return get().nodes.filter((n) => n.selected);
  },

  getSelectedEdges: () => {
    return get().edges.filter((e) => e.selected);
  },

  removeSelectedEdges: () => {
    const { edges } = get();
    set({
      edges: edges.filter((e) => !e.selected),
    });
  },

  clearSelection: () => {
    const { nodes, edges } = get();
    set({
      nodes: nodes.map((n) => ({ ...n, selected: false })) as LynkNode[],
      edges: edges.map((e) => ({ ...e, selected: false })),
    });
  },

  removeSelectedNodes: () => {
    const { nodes, edges } = get();
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);

    // Also remove children of selected groups
    const allIdsToRemove = new Set(selectedIds);
    for (const node of nodes) {
      if (node.parentId && allIdsToRemove.has(node.parentId)) {
        allIdsToRemove.add(node.id);
      }
    }

    set({
      nodes: nodes.filter((n) => !allIdsToRemove.has(n.id)),
      edges: edges.filter(
        (e) => !allIdsToRemove.has(e.source) && !allIdsToRemove.has(e.target)
      ),
    });
  },
});
