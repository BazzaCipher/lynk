import { useState, useCallback, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useCanvasStore } from '../../store/canvasStore';
import { useFileUpload, type FileUploadResult } from '../../hooks/useFileUpload';
import type {
  DisplayNode as DisplayNodeType,
  ExtractorNodeData,
} from '../../types';
import { createImageView, createPdfView } from '../../types';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_SIZE = 50;
const DEFAULT_WIDTH = 300;

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export function DisplayNode({ id, data, selected }: NodeProps<DisplayNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const replaceNode = useCanvasStore((state) => state.replaceNode);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const [activeCorner, setActiveCorner] = useState<ResizeCorner | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const resizeStartRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Get current page number from view target
  const currentPage = data.view.target.type === 'page' ? data.view.target.pageNumber : 1;

  const onFileRegistered = useCallback(
    (result: FileUploadResult) => {
      if (result.fileType === 'image') {
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
            fileUrl: result.fileUrl,
            fileId: result.fileId,
            fileName: result.fileName,
            fileType: 'image',
            view: createImageView(Math.round(width), Math.round(height)),
            totalPages: 1,
          });
        };
        img.src = result.fileUrl;
      } else {
        // PDF file
        updateNodeData(id, {
          fileUrl: result.fileUrl,
          fileId: result.fileId,
          fileName: result.fileName,
          fileType: 'pdf',
          view: createPdfView(1, 400, 300),
          totalPages: 1,
        });
      }
    },
    [id, updateNodeData]
  );

  const { handleFileSelect, handleFileDrop, handleDragOver } = useFileUpload({ onFileRegistered });

  const handlePdfLoad = useCallback(
    ({ numPages }: { numPages: number }) => {
      updateNodeData(id, { totalPages: numPages });
      setPdfError(null);
    },
    [id, updateNodeData]
  );

  const handlePdfError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setPdfError('Failed to load PDF');
  }, []);

  const handlePageChange = useCallback(
    (delta: number) => {
      const newPage = Math.max(1, Math.min(data.totalPages, currentPage + delta));
      updateNodeData(id, {
        view: {
          ...data.view,
          target: { type: 'page', pageNumber: newPage },
        },
      });
    },
    [id, data.view, data.totalPages, currentPage, updateNodeData]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: ResizeCorner) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingResize(true);
      setActiveCorner(corner);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: data.view.nodeSize.width,
        height: data.view.nodeSize.height,
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
        if (data.view.aspectLocked && data.view.nodeSize.width > 0 && data.view.nodeSize.height > 0) {
          const aspectRatio = resizeStartRef.current.width / resizeStartRef.current.height;
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
          // Re-enforce minimums
          newWidth = Math.max(MIN_SIZE, newWidth);
          newHeight = Math.max(MIN_SIZE, newHeight);
        }

        updateNodeData(id, {
          view: {
            ...data.view,
            nodeSize: {
              width: Math.round(newWidth),
              height: Math.round(newHeight),
            },
          },
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
    [id, data.view, updateNodeData]
  );

  const toggleAspectLock = useCallback(() => {
    updateNodeData(id, {
      view: {
        ...data.view,
        aspectLocked: !data.view.aspectLocked,
      },
    });
  }, [id, data.view, updateNodeData]);

  // Convert to ExtractorNode
  const convertToExtractor = useCallback(() => {
    // Get current page from view target
    const extractorCurrentPage = data.view.target.type === 'page'
      ? data.view.target.pageNumber
      : 1;

    // Create ExtractorNode with restored regions
    const extractorData: ExtractorNodeData = {
      label: data.label,
      fileType: data.fileType,
      fileUrl: data.fileUrl,
      fileId: data.fileId,
      fileName: data.fileName,
      regions: data.cachedExtractorEdges?.regions || [],
      currentPage: extractorCurrentPage,
      totalPages: data.totalPages,
    };

    // Replace node first
    replaceNode(id, 'extractor', extractorData);

    // Restore cached edges if available
    if (data.cachedExtractorEdges?.edges) {
      for (const cached of data.cachedExtractorEdges.edges) {
        addEdge({
          id: cached.id,
          source: id,
          sourceHandle: cached.sourceHandle,
          target: cached.target,
          targetHandle: cached.targetHandle,
        });
      }
    }
  }, [id, data, replaceNode, addEdge]);

  // Empty state - drop zone
  if (!data.fileUrl) {
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
            accept="image/*,application/pdf"
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
            <p>Drop an image or PDF</p>
            <p className="text-xs mt-1">or click to browse</p>
          </div>
        </label>
        <div className="mt-2 text-center text-xs text-gray-400">
          {data.label}
        </div>
      </div>
    );
  }

  // Loaded state - display with resize handles
  return (
    <div
      className={`
        relative bg-white rounded-lg shadow-md border-2 overflow-hidden
        ${selected ? 'border-blue-500' : 'border-gray-200'}
        ${isDraggingResize ? 'select-none' : ''}
      `}
      style={{ width: data.view.nodeSize.width, height: data.view.nodeSize.height }}
    >
      {/* Content display */}
      {data.fileType === 'image' ? (
        <img
          src={data.fileUrl}
          alt={data.fileName || 'Image'}
          className="w-full h-full object-contain bg-gray-50"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-gray-50 flex items-center justify-center overflow-hidden">
          {pdfError ? (
            <div className="text-red-500 text-sm">{pdfError}</div>
          ) : (
            <Document
              file={data.fileUrl}
              onLoadSuccess={handlePdfLoad}
              onLoadError={handlePdfError}
              loading={
                <div className="text-gray-400 text-sm">Loading PDF...</div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={data.view.nodeSize.width - 4}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          )}
        </div>
      )}

      {/* File name overlay on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1 opacity-0 hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{data.fileName}</p>
      </div>

      {/* PDF page navigation */}
      {data.fileType === 'pdf' && data.totalPages > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
          <button
            onClick={() => handlePageChange(-1)}
            disabled={currentPage <= 1}
            className="text-white disabled:opacity-50 p-0.5 hover:bg-white/20 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-white text-xs min-w-[40px] text-center">
            {currentPage}/{data.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage >= data.totalPages}
            className="text-white disabled:opacity-50 p-0.5 hover:bg-white/20 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Controls (visible when selected) */}
      {selected && (
        <>
          {/* Corner resize handles */}
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
              absolute top-1 right-8 p-1 rounded text-xs
              ${data.view.aspectLocked ? 'bg-blue-500 text-white' : 'bg-white/80 text-gray-600'}
              hover:bg-blue-600 hover:text-white transition-colors
            `}
            title={data.view.aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          >
            {data.view.aspectLocked ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
              </svg>
            )}
          </button>

          {/* Convert to Extractor button */}
          <button
            onClick={convertToExtractor}
            className="absolute top-1 right-1 p-1 rounded text-xs bg-white/80 text-gray-600 hover:bg-orange-500 hover:text-white transition-colors"
            title="Convert to Extractor Node"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
