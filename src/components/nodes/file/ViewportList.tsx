import { useCallback } from 'react';
import { Position } from '@xyflow/react';
import { NodeEntry } from '../base/NodeEntry';
import { useCanvasStore } from '../../../store/canvasStore';
import { Highlightable } from '../../../types/categories';
import type { ViewportRegion } from '../../../types';

interface ViewportListProps {
  viewports: ViewportRegion[];
  selectedViewportId: string | null;
  onViewportSelect: (viewportId: string) => void;
  onViewportDelete: (viewportId: string) => void;
  onViewportLabelChange: (viewportId: string, label: string) => void;
  compact?: boolean;
  nodeId?: string;
}

export function ViewportList({
  viewports,
  selectedViewportId,
  onViewportSelect,
  onViewportDelete,
  onViewportLabelChange,
  compact = false,
  nodeId,
}: ViewportListProps) {
  const highlightedHandle = useCanvasStore(state => state.highlightedHandle);
  const isExternallyHighlighted = useCallback(
    (viewportId: string): boolean => {
      if (!nodeId || !highlightedHandle) return false;
      return Highlightable.matches(highlightedHandle, nodeId, viewportId);
    },
    [highlightedHandle, nodeId]
  );

  if (viewports.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-bridge-400 text-center">
        {compact ? 'No viewports' : 'Draw a box to create a viewport region'}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="divide-y divide-paper-100">
        {viewports.map((viewport) => {
          const isExternal = isExternallyHighlighted(viewport.id);

          return (
            <NodeEntry
              key={viewport.id}
              id={viewport.id}
              handleType="source"
              handlePosition={Position.Right}
              handleColor="#c27350"
              className={`group hover:bg-paper-50 cursor-pointer ${
                selectedViewportId === viewport.id ? 'bg-copper-400/10' : ''
              } ${isExternal ? 'bg-copper-400/20 ring-1 ring-copper-400 animate-pulse' : ''}`}
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0 py-0.5"
                onClick={() => onViewportSelect(viewport.id)}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-copper-500" />
                <span className="text-xs text-bridge-700 truncate flex-1">
                  {viewport.label}
                </span>
                <span className="text-[10px] text-bridge-400">
                  p{viewport.pageNumber}
                </span>
              </div>
            </NodeEntry>
          );
        })}
      </div>
    );
  }

  // Full view (inside modal side panel)
  return (
    <div className="divide-y divide-paper-100">
      {viewports.map((viewport) => {
        const isExternal = isExternallyHighlighted(viewport.id);

        return (
          <div
            key={viewport.id}
            className={`p-3 hover:bg-paper-50 transition-colors cursor-pointer ${
              selectedViewportId === viewport.id ? 'bg-copper-400/10 ring-2 ring-copper-200 ring-inset' : ''
            } ${isExternal ? 'bg-copper-400/20 ring-1 ring-copper-400 animate-pulse' : ''}`}
            onClick={() => onViewportSelect(viewport.id)}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-copper-500" />
              <input
                type="text"
                value={viewport.label}
                onChange={(e) => {
                  e.stopPropagation();
                  onViewportLabelChange(viewport.id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm font-medium bg-transparent border-none outline-none focus:ring-0 p-0"
                placeholder="Label..."
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewportDelete(viewport.id);
                }}
                className="text-bridge-400 hover:text-red-500 transition-colors p-1"
                title="Delete viewport"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="mt-1 text-xs text-bridge-400">
              Page {viewport.pageNumber}
            </div>
          </div>
        );
      })}
    </div>
  );
}
