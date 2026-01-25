import { useState, useCallback, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import { BlobRegistry } from '../../store/canvasPersistence';
import type { ImageNode as ImageNodeType } from '../../types';

const MIN_SIZE = 50;
const DEFAULT_WIDTH = 300;

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export function ImageNode({ id, data, selected }: NodeProps<ImageNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const [activeCorner, setActiveCorner] = useState<ResizeCorner | null>(null);
  const resizeStartRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;

      const { fileId, blobUrl } = BlobRegistry.register(file);

      // Get natural dimensions of the image
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let width = DEFAULT_WIDTH;
        let height = width / aspectRatio;

        // Constrain to reasonable max dimensions
        if (height > 600) {
          height = 600;
          width = height * aspectRatio;
        }

        updateNodeData(id, {
          imageUrl: blobUrl,
          fileId,
          fileName: file.name,
          width: Math.round(width),
          height: Math.round(height),
        });
      };
      img.src = blobUrl;
    },
    [id, updateNodeData]
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;

      const { fileId, blobUrl } = BlobRegistry.register(file);

      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let width = DEFAULT_WIDTH;
        let height = width / aspectRatio;

        if (height > 600) {
          height = 600;
          width = height * aspectRatio;
        }

        updateNodeData(id, {
          imageUrl: blobUrl,
          fileId,
          fileName: file.name,
          width: Math.round(width),
          height: Math.round(height),
        });
      };
      img.src = blobUrl;
    },
    [id, updateNodeData]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: ResizeCorner) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingResize(true);
      setActiveCorner(corner);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: data.width,
        height: data.height,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeStartRef.current) return;

        const deltaX = moveEvent.clientX - resizeStartRef.current.x;
        const deltaY = moveEvent.clientY - resizeStartRef.current.y;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;

        // Calculate new dimensions based on corner
        if (corner === 'se') {
          newWidth = resizeStartRef.current.width + deltaX;
          newHeight = resizeStartRef.current.height + deltaY;
        } else if (corner === 'sw') {
          newWidth = resizeStartRef.current.width - deltaX;
          newHeight = resizeStartRef.current.height + deltaY;
        } else if (corner === 'ne') {
          newWidth = resizeStartRef.current.width + deltaX;
          newHeight = resizeStartRef.current.height - deltaY;
        } else if (corner === 'nw') {
          newWidth = resizeStartRef.current.width - deltaX;
          newHeight = resizeStartRef.current.height - deltaY;
        }

        // Enforce minimum size
        newWidth = Math.max(MIN_SIZE, newWidth);
        newHeight = Math.max(MIN_SIZE, newHeight);

        // If aspect locked, maintain ratio
        if (data.aspectLocked && data.width > 0 && data.height > 0) {
          const aspectRatio = resizeStartRef.current.width / resizeStartRef.current.height;
          if (corner === 'se' || corner === 'nw') {
            // Use the larger change
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              newHeight = newWidth / aspectRatio;
            } else {
              newWidth = newHeight * aspectRatio;
            }
          } else {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              newHeight = newWidth / aspectRatio;
            } else {
              newWidth = newHeight * aspectRatio;
            }
          }
          // Re-enforce minimums
          newWidth = Math.max(MIN_SIZE, newWidth);
          newHeight = Math.max(MIN_SIZE, newHeight);
        }

        updateNodeData(id, {
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      };

      const handleMouseUp = () => {
        setIsDraggingResize(false);
        setActiveCorner(null);
        resizeStartRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [id, data.width, data.height, data.aspectLocked, updateNodeData]
  );

  const toggleAspectLock = useCallback(() => {
    updateNodeData(id, { aspectLocked: !data.aspectLocked });
  }, [id, data.aspectLocked, updateNodeData]);

  // Empty state - drop zone
  if (!data.imageUrl) {
    return (
      <div
        className={`
          bg-white rounded-lg shadow-md border-2 p-4 w-[200px]
          ${selected ? 'border-blue-500' : 'border-gray-200'}
        `}
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        <label className="flex flex-col items-center justify-center h-32 cursor-pointer hover:bg-gray-50 transition-colors rounded border-2 border-dashed border-gray-300">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-gray-300 mb-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-gray-400 text-center">
            <p>Drop an image</p>
            <p className="text-xs mt-1">or click to browse</p>
          </div>
        </label>
        <div className="mt-2 text-center text-xs text-gray-400">
          {data.label}
        </div>
      </div>
    );
  }

  // Loaded state - image display with resize handles
  return (
    <div
      className={`
        relative bg-white rounded-lg shadow-md border-2 overflow-hidden
        ${selected ? 'border-blue-500' : 'border-gray-200'}
        ${isDraggingResize ? 'select-none' : ''}
      `}
      style={{ width: data.width, height: data.height }}
    >
      {/* Image */}
      <img
        src={data.imageUrl}
        alt={data.fileName || 'Image'}
        className="w-full h-full object-contain bg-gray-50"
        draggable={false}
      />

      {/* File name overlay on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1 opacity-0 hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{data.fileName}</p>
      </div>

      {/* Resize handles (visible when selected) */}
      {selected && (
        <>
          {/* Corner handles */}
          {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
            <div
              key={corner}
              className={`
                absolute w-3 h-3 bg-blue-500 border border-white rounded-sm
                ${corner.includes('n') ? 'top-0' : 'bottom-0'}
                ${corner.includes('w') ? 'left-0' : 'right-0'}
                ${corner === 'nw' || corner === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'}
                ${activeCorner === corner ? 'bg-blue-600' : ''}
                hover:bg-blue-600
              `}
              style={{
                transform: `translate(${corner.includes('w') ? '-50%' : '50%'}, ${corner.includes('n') ? '-50%' : '50%'})`,
              }}
              onMouseDown={(e) => handleResizeStart(e, corner)}
            />
          ))}

          {/* Aspect lock toggle */}
          <button
            onClick={toggleAspectLock}
            className={`
              absolute top-1 right-1 p-1 rounded text-xs
              ${data.aspectLocked ? 'bg-blue-500 text-white' : 'bg-white/80 text-gray-600'}
              hover:bg-blue-600 hover:text-white transition-colors
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
        </>
      )}
    </div>
  );
}
