/**
 * Canvas Validation Service
 *
 * Standalone functions for validating canvas data.
 */

import type { Edge } from '@xyflow/react';
import type { LynkNode, LynkNodeData } from '../types';
import {
  CalculationNode,
  ExtractorNode,
  DisplayNode,
  LabelNode,
  SheetNode,
} from '../types';

/**
 * Validate node data updates for common issues.
 */
export function validateNodeDataUpdate(
  nodeType: string,
  update: Partial<LynkNodeData>
): boolean {
  let isValid = true;

  if (nodeType === CalculationNode.type) {
    if ('precision' in update && typeof update.precision === 'number') {
      if (update.precision < 0 || update.precision > 10) {
        console.warn(`Invalid precision value: ${update.precision}. Should be 0-10.`);
        isValid = false;
      }
    }
  }

  if (nodeType === ExtractorNode.type) {
    if ('regions' in update && update.regions) {
      if (!Array.isArray(update.regions)) {
        console.warn('Invalid regions: expected array');
        isValid = false;
      }
    }
  }

  if (nodeType === DisplayNode.type) {
    if ('view' in update && update.view) {
      const view = update.view as { nodeSize?: { width?: number; height?: number } };
      if (view.nodeSize) {
        if (typeof view.nodeSize.width === 'number' && view.nodeSize.width <= 0) {
          console.warn(`Invalid view width: ${view.nodeSize.width}. Should be positive.`);
          isValid = false;
        }
        if (typeof view.nodeSize.height === 'number' && view.nodeSize.height <= 0) {
          console.warn(`Invalid view height: ${view.nodeSize.height}. Should be positive.`);
          isValid = false;
        }
      }
    }
  }

  if ('label' in update && update.label !== undefined) {
    if (typeof update.label !== 'string') {
      console.warn(`Invalid label type: expected string, got ${typeof update.label}`);
      isValid = false;
    }
  }

  return isValid;
}

/**
 * Get valid handles for a node based on its type and data.
 */
export function getValidHandles(node: LynkNode): Set<string> {
  const handles = new Set<string>();

  if (ExtractorNode.is(node)) {
    for (const region of node.data.regions) {
      handles.add(region.id);
    }
  } else if (CalculationNode.is(node)) {
    handles.add('inputs');
    handles.add('output');
  } else if (LabelNode.is(node)) {
    handles.add('input');
    handles.add('output');
  } else if (SheetNode.is(node)) {
    for (const subheader of node.data.subheaders) {
      handles.add(`subheader-${subheader.id}`);
      for (const entry of subheader.entries) {
        handles.add(`entry-in-${subheader.id}-${entry.id}`);
        handles.add(`entry-out-${subheader.id}-${entry.id}`);
      }
    }
  }

  return handles;
}

/**
 * Filter out invalid edges and return valid ones.
 */
export function filterValidEdges(nodes: LynkNode[], edges: Edge[]): { valid: Edge[]; removedCount: number } {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validHandles = new Map<string, Set<string>>();

  for (const node of nodes) {
    validHandles.set(node.id, getValidHandles(node));
  }

  const valid: Edge[] = [];
  let removedCount = 0;

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      removedCount++;
      continue;
    }

    const sourceHandles = validHandles.get(edge.source);
    if (edge.sourceHandle && sourceHandles && sourceHandles.size > 0) {
      if (!sourceHandles.has(edge.sourceHandle)) {
        removedCount++;
        continue;
      }
    }

    const targetHandles = validHandles.get(edge.target);
    if (edge.targetHandle && targetHandles && targetHandles.size > 0) {
      if (!targetHandles.has(edge.targetHandle)) {
        removedCount++;
        continue;
      }
    }

    valid.push(edge);
  }

  return { valid, removedCount };
}
