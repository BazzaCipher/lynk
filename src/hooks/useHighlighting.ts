/**
 * Highlighting Hooks
 *
 * Unified highlighting system using a single string ID format: "nodeId:handleId"
 * Works with Exportable.outputs for all highlightable nodes.
 */

import { useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { Highlightable } from '../types/categories';
import type { Exportable } from '../types/categories';
import type { ResolvedInput } from './useDataFlow';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns highlight state for all outputs of a node.
 * Derives handles from Exportable.outputs.
 */
export function useNodeHighlights(
  nodeId: string,
  data: Partial<Exportable>
): Record<string, boolean> {
  const highlighted = useCanvasStore(state => state.highlightedHandle);
  const handles = Highlightable.getHandles(data);

  return useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const handleId of handles) {
      result[handleId] = Highlightable.matches(highlighted, nodeId, handleId);
    }
    return result;
  }, [highlighted, nodeId, handles]);
}

/**
 * Check if ANY output of this node is highlighted.
 * Useful for propagation - if any output is highlighted, propagate to inputs.
 */
export function useIsNodeHighlighted(nodeId: string): boolean {
  const highlighted = useCanvasStore(state => state.highlightedHandle);
  if (!highlighted) return false;
  const parsed = Highlightable.parse(highlighted);
  return parsed?.nodeId === nodeId;
}

/**
 * Actions for setting/clearing highlights.
 */
export function useHighlightActions() {
  const setHighlighted = useCanvasStore(state => state.setHighlightedHandle);

  return useMemo(() => ({
    set: (nodeId: string, handleId: string) =>
      setHighlighted(Highlightable.target(nodeId, handleId)),
    clear: () => setHighlighted(null),
    toggle: (nodeId: string, handleId: string) => {
      const current = useCanvasStore.getState().highlightedHandle;
      const target = Highlightable.target(nodeId, handleId);
      setHighlighted(current === target ? null : target);
    },
  }), [setHighlighted]);
}

/**
 * For input rows - hover/click handlers + highlight state.
 */
export function useInputHighlighting(input: ResolvedInput) {
  const highlighted = useCanvasStore(state => state.highlightedHandle);
  const { set, clear, toggle } = useHighlightActions();

  const target = Highlightable.target(input.sourceNodeId, input.sourceRegionId);
  const isHighlighted = highlighted === target;

  return {
    isHighlighted,
    onMouseEnter: () => set(input.sourceNodeId, input.sourceRegionId),
    onMouseLeave: () => { if (!isHighlighted) clear(); },
    onClick: () => toggle(input.sourceNodeId, input.sourceRegionId),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE HOOKS (for simpler use cases)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a specific handle is highlighted.
 * Used by RegionList, HighlightOverlay for individual region checks.
 */
export function useIsHandleHighlighted(nodeId: string | undefined, handleId: string): boolean {
  const highlighted = useCanvasStore(state => state.highlightedHandle);
  if (!nodeId || !highlighted) return false;
  return Highlightable.matches(highlighted, nodeId, handleId);
}

/**
 * Hook for highlighting from an input list (used by CalculationNode, SheetNode).
 * Returns check function and handlers.
 */
export function useHighlighting() {
  const highlighted = useCanvasStore(state => state.highlightedHandle);
  const setHighlighted = useCanvasStore(state => state.setHighlightedHandle);

  const isHighlighted = (nodeId: string, regionId: string): boolean => {
    return Highlightable.matches(highlighted, nodeId, regionId);
  };

  const handleInputHover = (input: ResolvedInput | null) => {
    if (input) {
      setHighlighted(Highlightable.target(input.sourceNodeId, input.sourceRegionId));
    } else {
      setHighlighted(null);
    }
  };

  const handleInputClick = (input: ResolvedInput) => {
    const target = Highlightable.target(input.sourceNodeId, input.sourceRegionId);
    setHighlighted(highlighted === target ? null : target);
  };

  return {
    isHighlighted,
    handleInputHover,
    handleInputClick,
  };
}
