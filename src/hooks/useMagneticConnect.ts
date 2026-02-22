import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@xyflow/react';
import type { Node, InternalNode, OnNodeDrag } from '@xyflow/react';
import { useCanvasStore } from '../store/canvasStore';
import { Highlightable } from '../types/categories';
import { wouldCreateCycle } from '../core/engine/dependencyGraph';
import { CanExport, CanImport } from '../types/categories';
import type { LynkNode } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MagneticSnapTarget {
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
}

export interface UseMagneticConnectResult {
  magneticMode: boolean;
  snapTarget: MagneticSnapTarget | null;
  toggleMagneticMode: () => void;
  onNodeDrag: OnNodeDrag;
  onNodeDragStop: OnNodeDrag;
}

const SNAP_THRESHOLD = 100; // flow coordinates

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

type ReactFlowNodeLookup = Map<string, InternalNode>;

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a proposed connection would be valid using current store state.
 * Uses Zustand static accessor to avoid stale closures.
 */
function checkConnectionValid(
  sourceNodeId: string,
  sourceHandle: string,
  targetNodeId: string,
  targetHandle: string
): boolean {
  const { nodes, edges } = useCanvasStore.getState();

  if (sourceNodeId === targetNodeId) return false;
  if (wouldCreateCycle(edges, sourceNodeId, targetNodeId)) return false;

  const sourceNode = nodes.find((n) => n.id === sourceNodeId) as LynkNode | undefined;
  const targetNode = nodes.find((n) => n.id === targetNodeId) as LynkNode | undefined;
  if (!sourceNode || !targetNode) return false;

  if (!CanExport.is(sourceNode)) return false;
  if (!CanImport.is(targetNode)) return false;

  // Reject if this exact edge already exists
  const edgeId = `edge-${sourceNodeId}-${sourceHandle}-${targetNodeId}-${targetHandle}`;
  if (edges.some((e) => e.id === edgeId)) return false;

  // Reject if target handle already has an incoming edge
  if (edges.some((e) => e.target === targetNodeId && e.targetHandle === targetHandle)) return false;

  return true;
}

/**
 * Find the nearest compatible source→target handle pair within `threshold` px.
 *
 * Uses `node.position` (from the onNodeDrag event arg) for the dragged node's
 * current absolute position, since it's always up-to-date during a drag, while
 * nodeLookup.internals.positionAbsolute may lag one frame behind.
 */
function findNearestCompatibleHandle(
  draggedNode: Node,
  nodeLookup: ReactFlowNodeLookup,
  threshold: number
): MagneticSnapTarget | null {
  const draggedInternal = nodeLookup.get(draggedNode.id);
  if (!draggedInternal) return null;

  // The dragged node is the TARGET — snap its input handles to nearby source handles on other nodes.
  const draggedTargetHandles = draggedInternal.internals.handleBounds?.target;
  if (!draggedTargetHandles || draggedTargetHandles.length === 0) return null;

  // For top-level nodes `node.position` equals positionAbsolute.
  // For grouped nodes fall back to the internal value.
  const draggedOrigin = draggedNode.parentId
    ? draggedInternal.internals.positionAbsolute
    : draggedNode.position;

  let best: MagneticSnapTarget | null = null;
  let bestDist = threshold;

  for (const [nodeId, sourceInternal] of nodeLookup.entries()) {
    if (nodeId === draggedNode.id) continue;

    const sourceHandles = sourceInternal.internals.handleBounds?.source;
    if (!sourceHandles || sourceHandles.length === 0) continue;

    const sourceOrigin = sourceInternal.internals.positionAbsolute;

    for (const tgtHandle of draggedTargetHandles) {
      const tgtId = tgtHandle.id ?? 'default';
      const tgtCenter = {
        x: draggedOrigin.x + tgtHandle.x + tgtHandle.width / 2,
        y: draggedOrigin.y + tgtHandle.y + tgtHandle.height / 2,
      };

      for (const srcHandle of sourceHandles) {
        const srcId = srcHandle.id ?? 'default';
        const srcCenter = {
          x: sourceOrigin.x + srcHandle.x + srcHandle.width / 2,
          y: sourceOrigin.y + srcHandle.y + srcHandle.height / 2,
        };

        const d = distance(tgtCenter, srcCenter);
        if (d >= bestDist) continue;

        if (!checkConnectionValid(nodeId, srcId, draggedNode.id, tgtId)) continue;

        bestDist = d;
        best = {
          sourceNodeId: nodeId,
          sourceHandle: srcId,
          targetNodeId: draggedNode.id,
          targetHandle: tgtId,
        };
      }
    }
  }

  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useMagneticConnect(): UseMagneticConnectResult {
  const [magneticMode, setMagneticMode] = useState(false);
  const [snapTarget, setSnapTarget] = useState<MagneticSnapTarget | null>(null);

  const setHighlightedHandle = useCanvasStore((state) => state.setHighlightedHandle);
  const storeAddEdge = useCanvasStore((state) => state.addEdge);

  // Access ReactFlow's internal node lookup (valid because LynkCanvas is inside a ReactFlowProvider)
  const nodeLookup = useStore((state) => state.nodeLookup) as ReactFlowNodeLookup;

  // M key toggles magnetic mode on/off (sticky, not hold-to-use).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'm' || e.key === 'M') {
        setMagneticMode(prev => {
          if (prev) { setSnapTarget(null); setHighlightedHandle(null); }
          return !prev;
        });
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [setHighlightedHandle]);

  const toggleMagneticMode = useCallback(() => {
    setMagneticMode(prev => {
      if (prev) { setSnapTarget(null); setHighlightedHandle(null); }
      return !prev;
    });
  }, [setHighlightedHandle]);

  const onNodeDrag: OnNodeDrag = useCallback(
    (_event, node) => {
      if (!magneticMode) return;

      const nearest = findNearestCompatibleHandle(node, nodeLookup, SNAP_THRESHOLD);
      setSnapTarget(nearest);

      if (nearest) {
        setHighlightedHandle(Highlightable.target(nearest.targetNodeId, nearest.targetHandle));
      } else {
        setHighlightedHandle(null);
      }
    },
    [magneticMode, nodeLookup, setHighlightedHandle]
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, _node) => {
      const currentSnap = snapTarget;
      if (!magneticMode || !currentSnap) {
        setSnapTarget(null);
        return;
      }

      const { edges } = useCanvasStore.getState();
      const edgeId = `edge-${currentSnap.sourceNodeId}-${currentSnap.sourceHandle}-${currentSnap.targetNodeId}-${currentSnap.targetHandle}`;

      if (!edges.some((e) => e.id === edgeId)) {
        storeAddEdge({
          id: edgeId,
          source: currentSnap.sourceNodeId,
          sourceHandle: currentSnap.sourceHandle,
          target: currentSnap.targetNodeId,
          targetHandle: currentSnap.targetHandle,
        });
      }

      setSnapTarget(null);
      setHighlightedHandle(null);
    },
    [magneticMode, snapTarget, storeAddEdge, setHighlightedHandle]
  );

  return { magneticMode, snapTarget, toggleMagneticMode, onNodeDrag, onNodeDragStop };
}
