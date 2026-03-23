import { useState, useCallback, useEffect, type RefObject } from 'react';

/**
 * Shared zoom logic for document viewer modals (ExtractorNode, DisplayNode).
 * Handles Ctrl+wheel zoom and provides zoom state + controls.
 */
export function useDocumentZoom(
  containerRef: RefObject<HTMLDivElement | null>,
  isActive: boolean
) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isActive) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = -e.deltaY * 0.001;
      setZoom((prev) => Math.min(5, Math.max(0.25, prev * (1 + delta))));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isActive, containerRef]);

  const zoomIn = useCallback(() => setZoom((prev) => Math.min(5, prev + 0.1)), []);
  const zoomOut = useCallback(() => setZoom((prev) => Math.max(0.25, prev - 0.1)), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  return { zoom, setZoom, zoomIn, zoomOut, resetZoom };
}
