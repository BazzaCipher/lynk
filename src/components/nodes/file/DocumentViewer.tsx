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
  onContentResize?: (width: number, height: number) => void;
  onPageOffsetsChange?: (offsets: Map<number, number>) => void; // Callback when page offsets are calculated
  enableTextSelection?: boolean;
  width?: number;
  scrollMode?: boolean; // Enable smooth scroll through all pages
  children?: React.ReactNode; // Overlays to render inside the content area (for correct coordinate alignment)
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
  onContentResize,
  onPageOffsetsChange,
  enableTextSelection = true,
  width = 300,
  scrollMode = false,
  children,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); // Ref for document content area only
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

  // Track content dimensions and report via callback
  useEffect(() => {
    if (!onContentResize || !contentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          onContentResize(w, h);
        }
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [onContentResize]);

  // Calculate page offsets in scrollMode
  useEffect(() => {
    if (!scrollMode || totalPages <= 1 || !onPageOffsetsChange) return;

    // Use a small delay to ensure pages have rendered
    const timeoutId = setTimeout(() => {
      const offsets = new Map<number, number>();
      pageRefs.current.forEach((el, pageNum) => {
        offsets.set(pageNum, el.offsetTop);
      });
      if (offsets.size > 0) {
        onPageOffsetsChange(offsets);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [scrollMode, totalPages, loading, onPageOffsetsChange]);

  // Handle text selection
  useEffect(() => {
    if (!enableTextSelection || !onTextSelect) return;

    const handleMouseUp = () => {
      // Wait for next frame to ensure selection rects are finalized after drag
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const text = selection.toString().trim();
        if (!text) return;

        // Get the range
        const range = selection.getRangeAt(0);

        // Check if selection is within our content area
        if (!contentRef.current?.contains(range.commonAncestorContainer)) return;

        // Get bounding rectangles relative to content area (not including nav bar)
        const contentRect = contentRef.current.getBoundingClientRect();
        const clientRects = range.getClientRects();
        const rects: TextRange['rects'] = [];

        for (let i = 0; i < clientRects.length; i++) {
          const rect = clientRects[i];
          // Skip invalid rects (zero dimensions or at origin which indicates unrendered elements)
          if (rect.width <= 0 || rect.height <= 0) continue;

          const x = rect.left - contentRect.left;
          const y = rect.top - contentRect.top;

          // Skip rects with negative coordinates (outside content area)
          if (x < 0 || y < 0) continue;

          rects.push({
            x,
            y,
            width: rect.width,
            height: rect.height,
          });
        }

        // If no valid rects, don't create the selection
        if (rects.length === 0) return;

        const textRange: TextRange = {
          startOffset: range.startOffset,
          endOffset: range.endOffset,
          text,
          rects,
        };

        onTextSelect(textRange);

        // Clear selection after capturing
        selection.removeAllRanges();
      });
    };

    const content = contentRef.current;
    content?.addEventListener('mouseup', handleMouseUp);

    return () => {
      content?.removeEventListener('mouseup', handleMouseUp);
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
      {/* Document display - contentRef for text selection coordinate calculations */}
      {/* Children (overlays) are rendered inside this container to share the same coordinate space */}
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
              // Smooth scroll mode: render all pages
              Array.from({ length: totalPages }, (_, i) => (
                <div
                  key={i + 1}
                  className="mb-4 last:mb-0"
                  ref={(el) => {
                    if (el) pageRefs.current.set(i + 1, el);
                  }}
                  data-page-number={i + 1}
                >
                  <Page
                    pageNumber={i + 1}
                    width={width}
                    renderTextLayer={enableTextSelection}
                    renderAnnotationLayer={false}
                  />
                  <div className="text-center text-xs text-gray-400 py-1 bg-gray-200">
                    Page {i + 1} of {totalPages}
                  </div>
                </div>
              ))
            ) : (
              // Single page mode
              <Page
                pageNumber={currentPage}
                width={width}
                renderTextLayer={enableTextSelection}
                renderAnnotationLayer={false}
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
        {/* Render overlays inside content area for correct coordinate alignment */}
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
