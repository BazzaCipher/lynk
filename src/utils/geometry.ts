/**
 * Geometry Utilities
 *
 * Reusable functions for bounding box calculations and
 * coordinate transformations used across the canvas.
 */

import type { LynkNode } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default node dimensions when measured size is unavailable */
export const DEFAULT_NODE_WIDTH = 200;
export const DEFAULT_NODE_HEIGHT = 100;

/** Group node layout constants */
export const GROUP_PADDING = 20;
export const GROUP_HEADER_HEIGHT = 24;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDING BOX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the bounding box that contains all given nodes.
 * Uses measured dimensions when available, falls back to defaults.
 */
export function calculateBoundingBox(nodes: LynkNode[]): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const width = node.measured?.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? DEFAULT_NODE_HEIGHT;

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  return { minX, minY, maxX, maxY };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSITION TRANSFORMS
// ═══════════════════════════════════════════════════════════════════════════════

/** Convert a node's position from absolute to relative (for reparenting into a group) */
export function toRelativePosition(
  position: { x: number; y: number },
  origin: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: position.x - origin.x,
    y: position.y - origin.y,
  };
}

/** Convert a node's position from relative to absolute (for unparenting from a group) */
export function toAbsolutePosition(
  position: { x: number; y: number },
  origin: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: position.x + origin.x,
    y: position.y + origin.y,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP AUTO-FIT
// ═══════════════════════════════════════════════════════════════════════════════

/** Epsilon threshold to skip no-op adjustments */
const AUTO_FIT_EPSILON = 0.5;

/**
 * Recalculate group position/size to tightly wrap children.
 * Pure function - returns a new array only if adjustments were made.
 */
export function applyGroupAutoFit(nodes: LynkNode[]): LynkNode[] {
  // Build a map of group id → children
  const childrenByGroup = new Map<string, LynkNode[]>();
  for (const node of nodes) {
    if (node.parentId) {
      const parent = nodes.find((n) => n.id === node.parentId);
      if (parent?.type === 'group') {
        let children = childrenByGroup.get(node.parentId);
        if (!children) {
          children = [];
          childrenByGroup.set(node.parentId, children);
        }
        children.push(node);
      }
    }
  }

  if (childrenByGroup.size === 0) return nodes;

  let result = nodes;
  let changed = false;

  for (const [groupId, children] of childrenByGroup) {
    const group = result.find((n) => n.id === groupId);
    if (!group) continue;

    // Calculate bounding box of children (relative coords within group)
    const bbox = calculateBoundingBox(children);

    // Ideal child origin: children should start at (GROUP_PADDING, GROUP_PADDING + GROUP_HEADER_HEIGHT)
    const shiftX = bbox.minX - GROUP_PADDING;
    const shiftY = bbox.minY - (GROUP_PADDING + GROUP_HEADER_HEIGHT);

    const newWidth = bbox.maxX - bbox.minX + GROUP_PADDING * 2;
    const newHeight = bbox.maxY - bbox.minY + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT;

    const currentWidth = (group.data as { width?: number }).width ?? group.measured?.width ?? 0;
    const currentHeight = (group.data as { height?: number }).height ?? group.measured?.height ?? 0;

    // Skip if adjustment is negligible
    if (
      Math.abs(shiftX) < AUTO_FIT_EPSILON &&
      Math.abs(shiftY) < AUTO_FIT_EPSILON &&
      Math.abs(newWidth - currentWidth) < AUTO_FIT_EPSILON &&
      Math.abs(newHeight - currentHeight) < AUTO_FIT_EPSILON
    ) {
      continue;
    }

    changed = true;
    if (result === nodes) result = [...nodes]; // copy-on-write

    for (let i = 0; i < result.length; i++) {
      const node = result[i];

      if (node.id === groupId) {
        // Shift group absolute position and update size
        result[i] = {
          ...node,
          position: {
            x: node.position.x + shiftX,
            y: node.position.y + shiftY,
          },
          data: { ...node.data, width: newWidth, height: newHeight },
          style: { ...node.style, width: newWidth, height: newHeight },
        } as LynkNode;
      } else if (node.parentId === groupId) {
        // Compensate children so they stay in absolute position
        result[i] = {
          ...node,
          position: {
            x: node.position.x - shiftX,
            y: node.position.y - shiftY,
          },
        };
      }
    }
  }

  return changed ? result : nodes;
}
