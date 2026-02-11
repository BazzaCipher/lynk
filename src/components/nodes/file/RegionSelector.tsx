import { useState, useCallback, useRef, type MouseEvent } from 'react';
import type { RegionCoordinates } from '../../../types';

interface RegionSelectorProps {
  onRegionCreate: (coordinates: RegionCoordinates, pageNumber?: number) => void;
  width: number;
  height: number;
  pageOffsets?: Map<number, number>; // Y offset for each page in scrollMode
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function RegionSelector({
  onRegionCreate,
  width,
  height,
  pageOffsets,
}: RegionSelectorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Determine which page a Y coordinate belongs to
  const getPageForY = (y: number): { pageNumber: number; localY: number } => {
    if (!pageOffsets || pageOffsets.size === 0) {
      return { pageNumber: 1, localY: y };
    }

    let currentPage = 1;
    let currentOffset = 0;

    // Find the page this Y coordinate is on
    const sortedEntries = Array.from(pageOffsets.entries()).sort((a, b) => a[1] - b[1]);
    for (const [pageNum, offset] of sortedEntries) {
      if (y >= offset) {
        currentPage = pageNum;
        currentOffset = offset;
      }
    }

    return { pageNumber: currentPage, localY: y - currentOffset };
  };

  const getRelativeCoordinates = useCallback(
    (e: MouseEvent): { x: number; y: number } => {
      if (!overlayRef.current) return { x: 0, y: 0 };
      const rect = overlayRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Don't start if clicking on a region or viewport overlay
      const target = e.target as HTMLElement;
      if (target.closest('[data-region-id]') || target.closest('[data-viewport-id]')) {
        return;
      }

      const coords = getRelativeCoordinates(e);
      setDragState({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
    },
    [getRelativeCoordinates]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState) return;

      const coords = getRelativeCoordinates(e);
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: coords.x,
              currentY: coords.y,
            }
          : null
      );
    },
    [dragState, getRelativeCoordinates]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState) return;

    const minSize = 10; // Minimum region size in pixels
    const regionWidth = Math.abs(dragState.currentX - dragState.startX);
    const regionHeight = Math.abs(dragState.currentY - dragState.startY);

    if (regionWidth >= minSize && regionHeight >= minSize) {
      const globalY = Math.min(dragState.startY, dragState.currentY);

      // Determine which page this region is on (based on top of selection)
      const { pageNumber, localY } = getPageForY(globalY);

      const coordinates: RegionCoordinates = {
        x: Math.min(dragState.startX, dragState.currentX),
        y: localY,
        width: regionWidth,
        height: regionHeight,
      };
      onRegionCreate(coordinates, pageNumber);
    }

    setDragState(null);
  }, [dragState, onRegionCreate, getPageForY]);

  // Calculate selection box dimensions
  const selectionBox = dragState
    ? {
        x: Math.min(dragState.startX, dragState.currentX),
        y: Math.min(dragState.startY, dragState.currentY),
        width: Math.abs(dragState.currentX - dragState.startX),
        height: Math.abs(dragState.currentY - dragState.startY),
      }
    : null;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 cursor-crosshair"
      style={{ width, height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Selection box while dragging */}
      {selectionBox && selectionBox.width > 0 && selectionBox.height > 0 && (
        <div
          className="absolute border-2 border-dashed border-blue-500 pointer-events-none"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.width,
            height: selectionBox.height,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          }}
        />
      )}
    </div>
  );
}

// Export for backwards compatibility
export function getNextRegionColor(): string {
  return '#3b82f6'; // Default blue, actual color determined by dataType
}
