import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { TextRange } from '../../../types';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  fileUrl: string | null;
  fileType: 'pdf' | 'image';
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDocumentLoad: (numPages: number) => void;
  onImageRef?: (element: HTMLImageElement | HTMLCanvasElement | null) => void;
  onTextSelect?: (textRange: TextRange) => void;
  enableTextSelection?: boolean;
  width?: number;
  scrollMode?: boolean;
  children?: React.ReactNode;
  devicePixelRatio?: number;
}

export function DocumentViewer({
  fileUrl,
  fileType,
  currentPage,
  totalPages,
  onPageChange,
  onDocumentLoad,
  onImageRef,
  onTextSelect,
  enableTextSelection = true,
  width = 300,
  scrollMode = false,
  children,
  devicePixelRatio,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  // For PDFs, call onImageRef with the first canvas after render
  useEffect(() => {
    if (fileType === 'pdf' && !loading && onImageRef) {
      const timer = setTimeout(() => {
        if (pdfCanvasRef.current) {
          onImageRef(pdfCanvasRef.current);
        } else if (contentRef.current) {
          const canvas = contentRef.current.querySelector('canvas');
          if (canvas) {
            onImageRef(canvas as HTMLCanvasElement);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fileType, loading, onImageRef, currentPage]);

  const handlePdfLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setLoading(false);
      setError(null);
      onDocumentLoad(numPages);
    },
    [onDocumentLoad]
  );

  const handlePdfLoadError = useCallback((err: Error) => {
    setLoading(false);
    setError(`Failed to load PDF: ${err.message}`);
  }, []);

  const handleImageLoad = useCallback(() => {
    setLoading(false);
    setError(null);
    onDocumentLoad(1);
  }, [onDocumentLoad]);

  const handleImageError = useCallback(() => {
    setLoading(false);
    setError('Failed to load image');
  }, []);

  // Handle text selection (drag and double-click)
  useEffect(() => {
    if (!enableTextSelection || !onTextSelect) return;

    const captureSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (!text) return;

      const range = selection.getRangeAt(0);

      if (!contentRef.current?.contains(range.commonAncestorContainer)) return;

      const contentRect = contentRef.current.getBoundingClientRect();
      const clientRects = range.getClientRects();
      const rects: TextRange['rects'] = [];

      for (let i = 0; i < clientRects.length; i++) {
        const rect = clientRects[i];
        if (rect.width <= 0 || rect.height <= 0) continue;

        const x = rect.left - contentRect.left;
        const y = rect.top - contentRect.top;

        if (x < 0 || y < 0) continue;

        rects.push({
          x,
          y,
          width: rect.width,
          height: rect.height,
        });
      }

      if (rects.length === 0) return;

      const textRange: TextRange = {
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        text,
        rects,
      };

      onTextSelect(textRange);
      selection.removeAllRanges();
    };

    const handleMouseUp = () => {
      requestAnimationFrame(captureSelection);
    };

    const handleDblClick = () => {
      captureSelection();
    };

    const content = contentRef.current;
    content?.addEventListener('mouseup', handleMouseUp);
    content?.addEventListener('dblclick', handleDblClick);

    return () => {
      content?.removeEventListener('mouseup', handleMouseUp);
      content?.removeEventListener('dblclick', handleDblClick);
    };
  }, [enableTextSelection, onTextSelect]);

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-50 text-gray-400 text-sm">
        No document loaded
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-40 bg-red-50 text-red-600 text-sm p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative overflow-hidden bg-gray-100" ref={contentRef}>
        {fileType === 'pdf' ? (
          <Document
            file={fileUrl}
            onLoadSuccess={handlePdfLoadSuccess}
            onLoadError={handlePdfLoadError}
            loading={
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                Loading PDF...
              </div>
            }
          >
            {scrollMode && totalPages > 1 ? (
              Array.from({ length: totalPages }, (_, i) => (
                <div key={i + 1} className="mb-4 last:mb-0">
                  <Page
                    pageNumber={i + 1}
                    width={width}
                    renderTextLayer={enableTextSelection}
                    renderAnnotationLayer={false}
                    devicePixelRatio={devicePixelRatio}
                  />
                  <div className="text-center text-xs text-gray-400 py-1 bg-gray-200">
                    Page {i + 1} of {totalPages}
                  </div>
                </div>
              ))
            ) : (
              <Page
                pageNumber={currentPage}
                width={width}
                renderTextLayer={enableTextSelection}
                renderAnnotationLayer={false}
                canvasRef={pdfCanvasRef}
                devicePixelRatio={devicePixelRatio}
              />
            )}
          </Document>
        ) : (
          <img
            ref={onImageRef as React.Ref<HTMLImageElement>}
            src={fileUrl}
            alt="Document"
            className="max-w-full h-auto"
            style={{ width }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        {children}
      </div>

      {/* Page navigation for PDFs - only show in single page mode */}
      {fileType === 'pdf' && totalPages > 1 && !scrollMode && (
        <div className="flex items-center justify-center gap-2 py-2 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <span className="text-xs text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      )}
    </div>
  );
}
