import { useCallback, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position, useEdges, useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import { ResizeHandle } from '../ui/ResizeHandle';
import { CroppedContent } from './file/CroppedContent';
import type { ViewportNode as ViewportNodeType, DisplayNodeData } from '../../types';

const MIN_SIZE = 50;

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export function ViewportNode({ id, data, selected }: NodeProps<ViewportNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const updateViewportRegion = useCanvasStore((state) => state.updateViewportRegion);
  const edges = useEdges();
  const { getNode, setCenter, setNodes } = useReactFlow();

  // Use data props directly - all data is stored in the node
  const { fileUrl, fileType, normalizedRect, pageNumber = 1 } = data;

  // Find the connected DisplayNode to get source document size
  const sourceInfo = useMemo(() => {
    const incomingEdge = edges.find(
      (e) => e.target === id && e.targetHandle === 'viewport-in'
    );
    if (!incomingEdge) return null;

    const displayNode = getNode(incomingEdge.source);
    if (!displayNode || displayNode.type !== 'display') return null;

    const displayData = displayNode.data as DisplayNodeData;
    return {
      displayNodeId: displayNode.id,
      viewportId: incomingEdge.sourceHandle || '',
      documentSize: displayData.documentSize,
    };
  }, [edges, id, getNode]);

  const handleDoubleClick = useCallback(() => {
    if (!sourceInfo?.displayNodeId) return;

    const displayNode = getNode(sourceInfo.displayNodeId);
    if (!displayNode) return;

    // Calculate center of the DisplayNode
    const nodeWidth = displayNode.measured?.width ?? 300;
    const nodeHeight = displayNode.measured?.height ?? 200;
    const centerX = displayNode.position.x + nodeWidth / 2;
    const centerY = displayNode.position.y + nodeHeight / 2;

    // Pan to the node with animation
    setCenter(centerX, centerY, { duration: 300, zoom: 1 });

    // Select the DisplayNode
    setNodes(nodes => nodes.map(n => ({
      ...n,
      selected: n.id === sourceInfo.displayNodeId
    })));
  }, [sourceInfo, getNode, setCenter, setNodes]);

  const handleResize = useCallback(
    (dx: number, dy: number, corner: ResizeCorner, shiftKey: boolean) => {
      let { width, height } = data.nodeSize;
      const oldWidth = width;
      const oldHeight = height;

      if (corner === 'se') {
        width += dx;
        height += dy;
      } else if (corner === 'sw') {
        width -= dx;
        height += dy;
      } else if (corner === 'ne') {
        width += dx;
        height -= dy;
      } else if (corner === 'nw') {
        width -= dx;
        height -= dy;
      }

      width = Math.max(MIN_SIZE, width);
      height = Math.max(MIN_SIZE, height);

      if (data.aspectLocked && data.nodeSize.width > 0 && data.nodeSize.height > 0) {
        const aspectRatio = data.nodeSize.width / data.nodeSize.height;
        if (Math.abs(dx) > Math.abs(dy)) {
          height = width / aspectRatio;
        } else {
          width = height * aspectRatio;
        }
        width = Math.max(MIN_SIZE, width);
        height = Math.max(MIN_SIZE, height);
      }

      if (shiftKey) {
        // Scale mode: just change nodeSize, keep crop region unchanged
        updateNodeData(id, {
          nodeSize: { width: Math.round(width), height: Math.round(height) },
        });
      } else {
        // Crop mode: expand/contract the visible region proportionally
        if (normalizedRect && sourceInfo) {
          const widthRatio = width / oldWidth;
          const heightRatio = height / oldHeight;

          const newNormalizedRect = {
            ...normalizedRect,
            width: normalizedRect.width * widthRatio,
            height: normalizedRect.height * heightRatio,
          };

          // Clamp to valid range (0-1)
          newNormalizedRect.width = Math.min(1 - newNormalizedRect.x, Math.max(0.01, newNormalizedRect.width));
          newNormalizedRect.height = Math.min(1 - newNormalizedRect.y, Math.max(0.01, newNormalizedRect.height));

          updateNodeData(id, {
            nodeSize: { width: Math.round(width), height: Math.round(height) },
            normalizedRect: newNormalizedRect,
          });

          // Sync to DisplayNode viewport overlay
          updateViewportRegion(sourceInfo.displayNodeId, sourceInfo.viewportId, {
            normalizedRect: newNormalizedRect,
          });
        } else {
          // No source info, just update size
          updateNodeData(id, {
            nodeSize: { width: Math.round(width), height: Math.round(height) },
          });
        }
      }
    },
    [id, data.nodeSize, data.aspectLocked, normalizedRect, sourceInfo, updateNodeData, updateViewportRegion]
  );

  const toggleAspectLock = useCallback(() => {
    updateNodeData(id, { aspectLocked: !data.aspectLocked });
  }, [id, data.aspectLocked, updateNodeData]);

  // No file or crop data - show placeholder
  if (!fileUrl || !normalizedRect) {
    return (
      <div
        className={`
          bg-white rounded-lg shadow-md border-2 flex items-center justify-center
          ${selected ? 'border-copper-500' : 'border-paper-200'}
        `}
        style={{ width: data.nodeSize.width, height: data.nodeSize.height }}
      >
        <div className="text-xs text-bridge-400 text-center px-2">
          <p>Viewport</p>
          <p className="text-[10px] mt-1">No data</p>
        </div>
        <Handle
          type="target"
          position={Position.Left}
          id="viewport-in"
          style={{ opacity: 0, pointerEvents: 'none' }}
        />
      </div>
    );
  }

  // Calculate pixel crop from normalized rect
  const documentSize = sourceInfo?.documentSize;
  const pixelCrop = documentSize
    ? {
        x: normalizedRect.x * documentSize.width,
        y: normalizedRect.y * documentSize.height,
        width: normalizedRect.width * documentSize.width,
        height: normalizedRect.height * documentSize.height,
      }
    : null;

  return (
    <div
      className={`
        relative bg-white rounded-lg shadow-md border-2
        ${selected ? 'border-copper-500' : 'border-paper-200'}
      `}
      style={{ width: data.nodeSize.width, height: data.nodeSize.height, overflow: 'visible' }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Content clipping layer */}
      <div className="absolute inset-0 overflow-hidden rounded-md">
        {pixelCrop && documentSize ? (
          <CroppedContent
            fileUrl={fileUrl}
            fileType={fileType || 'image'}
            pageNumber={pageNumber}
            crop={pixelCrop}
            displayWidth={data.nodeSize.width}
            displayHeight={data.nodeSize.height}
            sourceWidth={documentSize.width}
            sourceHeight={documentSize.height}
          />
        ) : (
          // Fallback to old rendering when no document size available
          <div
            className="w-full h-full"
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            {fileType === 'image' ? (
              <img
                src={fileUrl}
                alt={data.label || 'Viewport'}
                draggable={false}
                style={{
                  position: 'absolute',
                  width: `${100 / normalizedRect.width}%`,
                  height: `${100 / normalizedRect.height}%`,
                  transform: `translate(${-normalizedRect.x * 100}%, ${-normalizedRect.y * 100}%)`,
                  transformOrigin: 'top left',
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-bridge-400">
                PDF viewport
              </div>
            )}
          </div>
        )}
      </div>

      {/* Label overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/40 to-transparent px-2 py-1 opacity-0 hover:opacity-100 transition-opacity rounded-t-md">
        <p className="text-xs text-white truncate">{data.label}</p>
      </div>

      {/* Aspect lock toggle */}
      {selected && (
        <button
          onClick={toggleAspectLock}
          className={`
            absolute top-1 right-1 p-1 rounded text-xs z-10
            ${data.aspectLocked ? 'bg-copper-500 text-white' : 'bg-white/80 text-bridge-600'}
            hover:bg-copper-500 hover:text-white transition-colors
          `}
          title={data.aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
        >
          {data.aspectLocked ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
            </svg>
          )}
        </button>
      )}

      {/* Resize handles */}
      {selected && (
        <>
          {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
            <ResizeHandle
              key={corner}
              corner={corner}
              onResize={handleResize}
            />
          ))}
        </>
      )}

      {/* Hidden handle for edge connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="viewport-in"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}
