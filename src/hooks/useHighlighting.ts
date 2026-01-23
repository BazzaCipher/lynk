/**
 * Unified highlighting hook for source region highlighting.
 * Consolidates highlight logic from CalculationNode, SheetNode, LabelNode, RegionList, and HighlightOverlay.
 */

import { useCallback, useMemo } from 'react';
import { useCanvasStore, type HighlightedRegion } from '../store/canvasStore';
import type { DataSourceReference } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HighlightTarget {
  nodeId: string;
  regionId: string;
}

export interface UseHighlightingResult {
  /** Current highlighted region from store */
  highlightedRegion: HighlightedRegion | null;
  /** Check if a specific region is highlighted */
  isHighlighted: (nodeId: string, regionId: string) => boolean;
  /** Set highlight to a specific region */
  setHighlight: (nodeId: string, regionId: string) => void;
  /** Clear highlight */
  clearHighlight: () => void;
  /** Toggle highlight (for click handlers) */
  toggleHighlight: (nodeId: string, regionId: string) => void;
  /** Mouse enter handler - sets highlight */
  createMouseEnterHandler: (nodeId: string, regionId: string) => () => void;
  /** Mouse leave handler - clears highlight if not persistent */
  createMouseLeaveHandler: (nodeId: string, regionId: string) => () => void;
  /** Click handler - toggles persistent highlight */
  createClickHandler: (nodeId: string, regionId: string) => () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook for managing region highlighting state and handlers.
 * Provides unified API for highlight-related functionality across all components.
 */
export function useHighlighting(): UseHighlightingResult {
  const highlightedRegion = useCanvasStore((state) => state.highlightedRegion);
  const setHighlightedRegion = useCanvasStore((state) => state.setHighlightedRegion);

  const isHighlighted = useCallback(
    (nodeId: string, regionId: string): boolean => {
      if (!highlightedRegion) return false;
      return highlightedRegion.nodeId === nodeId && highlightedRegion.regionId === regionId;
    },
    [highlightedRegion]
  );

  const setHighlight = useCallback(
    (nodeId: string, regionId: string) => {
      setHighlightedRegion({ nodeId, regionId });
    },
    [setHighlightedRegion]
  );

  const clearHighlight = useCallback(() => {
    setHighlightedRegion(null);
  }, [setHighlightedRegion]);

  const toggleHighlight = useCallback(
    (nodeId: string, regionId: string) => {
      if (isHighlighted(nodeId, regionId)) {
        setHighlightedRegion(null);
      } else {
        setHighlightedRegion({ nodeId, regionId });
      }
    },
    [isHighlighted, setHighlightedRegion]
  );

  const createMouseEnterHandler = useCallback(
    (nodeId: string, regionId: string) => () => {
      setHighlightedRegion({ nodeId, regionId });
    },
    [setHighlightedRegion]
  );

  const createMouseLeaveHandler = useCallback(
    (nodeId: string, regionId: string) => () => {
      // Only clear if not currently the persistent highlight
      if (!isHighlighted(nodeId, regionId)) {
        setHighlightedRegion(null);
      }
    },
    [isHighlighted, setHighlightedRegion]
  );

  const createClickHandler = useCallback(
    (nodeId: string, regionId: string) => () => {
      toggleHighlight(nodeId, regionId);
    },
    [toggleHighlight]
  );

  return {
    highlightedRegion,
    isHighlighted,
    setHighlight,
    clearHighlight,
    toggleHighlight,
    createMouseEnterHandler,
    createMouseLeaveHandler,
    createClickHandler,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE-BASED HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseSourceHighlightingResult {
  /** Whether this source is currently highlighted */
  isHighlighted: boolean;
  /** Mouse enter handler */
  onMouseEnter: () => void;
  /** Mouse leave handler */
  onMouseLeave: () => void;
  /** Click handler (toggles persistent highlight) */
  onClick: () => void;
}

/**
 * Hook for highlighting based on a DataSourceReference.
 * Simplified API for components that work with a single source.
 */
export function useSourceHighlighting(source: DataSourceReference | null): UseSourceHighlightingResult {
  const { isHighlighted: checkHighlighted, setHighlight, clearHighlight, toggleHighlight } =
    useHighlighting();

  const isHighlighted = useMemo(() => {
    if (!source) return false;
    return checkHighlighted(source.nodeId, source.regionId);
  }, [source, checkHighlighted]);

  const onMouseEnter = useCallback(() => {
    if (source) {
      setHighlight(source.nodeId, source.regionId);
    }
  }, [source, setHighlight]);

  const onMouseLeave = useCallback(() => {
    if (source && !isHighlighted) {
      clearHighlight();
    }
  }, [source, isHighlighted, clearHighlight]);

  const onClick = useCallback(() => {
    if (source) {
      toggleHighlight(source.nodeId, source.regionId);
    }
  }, [source, toggleHighlight]);

  return {
    isHighlighted,
    onMouseEnter,
    onMouseLeave,
    onClick,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTERNAL HIGHLIGHT CHECK (for RegionList, HighlightOverlay)
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseExternalHighlightResult {
  /** Check if a region is externally highlighted */
  isExternallyHighlighted: (regionId: string) => boolean;
  /** Current highlighted region */
  highlightedRegion: HighlightedRegion | null;
}

/**
 * Hook for checking if regions are externally highlighted.
 * Used by components that display regions and need to respond to external highlights.
 */
export function useExternalHighlight(nodeId: string | undefined): UseExternalHighlightResult {
  const highlightedRegion = useCanvasStore((state) => state.highlightedRegion);

  const isExternallyHighlighted = useCallback(
    (regionId: string): boolean => {
      if (!highlightedRegion || !nodeId) return false;
      return highlightedRegion.nodeId === nodeId && highlightedRegion.regionId === regionId;
    },
    [highlightedRegion, nodeId]
  );

  return {
    isExternallyHighlighted,
    highlightedRegion,
  };
}
