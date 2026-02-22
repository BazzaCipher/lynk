import { useCallback } from 'react';
import { useCanvasStore } from '../../../store/canvasStore';
import { Highlightable } from '../../../types/categories';
import type { ViewportRegion } from '../../../types';

interface ViewportOverlayProps {
  viewports: ViewportRegion[];
  currentPage: number;
  selectedViewportId: string | null;
  onViewportSelect: (viewportId: string) => void;
  interactive?: boolean;
  nodeId?: string;
  scrollMode?: boolean;
  pageOffsets?: Map<number, number>;
}

export function ViewportOverlay({
  viewports,
  currentPage,
  selectedViewportId,
  onViewportSelect,
  interactive = true,
  nodeId,
  scrollMode = false,
  pageOffsets,
}: ViewportOverlayProps) {
  const highlightedHandle = useCanvasStore(state => state.highlightedHandle);
  const isExternallyHighlighted = useCallback(
    (viewportId: string): boolean => {
      if (!nodeId || !highlightedHandle) return false;
      return Highlightable.matches(highlightedHandle, nodeId, viewportId);
    },
    [highlightedHandle, nodeId]
  );

  // Helper to get Y offset for a page in scrollMode
  const getPageOffset = (pageNumber: number): number => {
    if (!scrollMode || !pageOffsets) return 0;
    return pageOffsets.get(pageNumber) ?? 0;
  };

  // In scroll mode show viewports from all pages, otherwise filter by current page
  const filteredViewports = scrollMode
    ? viewports
    : viewports.filter((v) => v.pageNumber === currentPage);

  if (filteredViewports.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {filteredViewports.map((viewport) => {
        const isSelected = selectedViewportId === viewport.id;
        const isExternal = isExternallyHighlighted(viewport.id);

        return (
          <div
            key={viewport.id}
            data-viewport-id={viewport.id}
            className={`absolute transition-all duration-150 ${
              interactive ? 'pointer-events-auto cursor-pointer' : ''
            } ${isExternal ? 'animate-pulse' : ''}`}
            style={{
              left: viewport.pixelRect.x,
              top: getPageOffset(viewport.pageNumber) + viewport.pixelRect.y,
              width: viewport.pixelRect.width,
              height: viewport.pixelRect.height,
              backgroundColor: isSelected || isExternal
                ? 'rgba(99, 102, 241, 0.15)'
                : 'rgba(99, 102, 241, 0.05)',
              borderWidth: 2,
              borderStyle: isSelected || isExternal ? 'solid' : 'dashed',
              borderColor: '#6366f1',
              boxShadow: isExternal
                ? '0 0 0 3px #6366f1, 0 0 12px 4px rgba(99, 102, 241, 0.3)'
                : isSelected
                ? '0 0 0 2px rgba(99, 102, 241, 0.3)'
                : 'none',
            }}
            onClick={interactive ? () => onViewportSelect(viewport.id) : undefined}
          >
            {/* Viewport label */}
            <div
              className={`absolute -top-5 left-0 px-1.5 py-0.5 text-xs text-white rounded-t whitespace-nowrap font-medium ${
                isExternal ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: '#6366f1' }}
            >
              {viewport.label}
            </div>

            {/* Corner dots for selected/highlighted */}
            {(isSelected || isExternal) && (
              <>
                <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-indigo-500" />
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-indigo-500" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-indigo-500" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
