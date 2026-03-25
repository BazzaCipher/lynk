import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useMultiPageScroll } from '../../../hooks/useMultiPageScroll';
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
  onPageOffsetsChange?: (offsets: Map<number, number>) => void;
  onSinglePageSize?: (width: number, height: number) => void;
  enableTextSelection?: boolean;
  width?: number;
  scrollMode?: boolean;
  deferLoading?: boolean;
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
  onContentResize,
  onPageOffsetsChange,
  onSinglePageSize,
  enableTextSelection = true,
  width = 300,
  scrollMode = false,
  deferLoading = false,
  children,
  devicePixelRatio,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  // Multi-page scroll hook for lazy loading
  const multiPage = useMultiPageScroll({
    totalPages,
    buffer: 2,
    deferLoading: scrollMode ? deferLoading : false,
  });

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

  // Forward page offsets from hook to parent
  useEffect(() => {
    if (scrollMode && onPageOffsetsChange && multiPage.pageOffsets.size > 0) {
      onPageOffsetsChange(multiPage.pageOffsets);
    }
  }, [scrollMode, multiPage.pageOffsets, onPageOffsetsChange]);

  // Forward single page size to parent
  useEffect(() => {
    if (onSinglePageSize && multiPage.singlePageSize) {
      onSinglePageSize(multiPage.singlePageSize.width, multiPage.singlePageSize.height);
    }
  }, [onSinglePageSize, multiPage.singlePageSize]);

  // Assign scroll container ref when in scroll mode
  useEffect(() => {
    if (scrollMode && containerRef.current) {
      const scrollParent = containerRef.current.closest('.overflow-auto');
      if (scrollParent) {
        (multiPage.scrollContainerRef as React.MutableRefObject<HTMLElement | null>).current = scrollParent as HTMLElement;
      }
    }
  }, [scrollMode, multiPage.scrollContainerRef]);

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
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        let text = selection.toString().trim();
        if (!text) return;

        const range = selection.getRangeAt(0);

        if (!contentRef.current?.contains(range.commonAncestorContainer)) return;

        // Check if a currency symbol sits immediately before the selection start.
        const CURRENCY_CHARS = '$€£¥₹₩₪₫₱';
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        let currencyPrefix = '';

        if (startOffset > 0 && startContainer.nodeType === Node.TEXT_NODE) {
          const charBefore = (startContainer.textContent ?? '')[startOffset - 1];
          if (CURRENCY_CHARS.includes(charBefore)) {
            currencyPrefix = charBefore;
          }
        } else {
          const el = startContainer.nodeType === Node.TEXT_NODE
            ? startContainer.parentElement
            : startContainer as Element;
          const prev = el?.previousElementSibling ?? el?.previousSibling;
          if (prev) {
            const prevText = prev.textContent?.trim() ?? '';
            const lastChar = prevText[prevText.length - 1] ?? '';
            if (prevText.length <= 3 && CURRENCY_CHARS.includes(lastChar)) {
              currencyPrefix = lastChar;
            }
          }
        }

        if (currencyPrefix) text = currencyPrefix + text;

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
      });
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

  // Estimate placeholder height for non-visible pages
  const placeholderHeight = multiPage.singlePageSize
    ? multiPage.singlePageSize.height
    : width * 1.294; // Letter paper aspect ratio fallback

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-40 bg-paper-50 text-bridge-400 text-sm">
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
      {/* Document display */}
      <div className="relative overflow-hidden bg-paper-100" ref={contentRef}>
        {fileType === 'pdf' ? (
          <Document
            file={fileUrl}
            onLoadSuccess={handlePdfLoadSuccess}
            onLoadError={handlePdfLoadError}
            loading={
              <div className="flex items-center justify-center h-40 text-bridge-500 text-sm">
                Loading PDF...
              </div>
            }
          >
            {scrollMode && totalPages > 1 ? (
              Array.from({ length: totalPages }, (_, i) => {
                const pageNum = i + 1;
                const isVisible = multiPage.isActivated && multiPage.visiblePages.has(pageNum);

                return (
                  <div
                    key={pageNum}
                    className="mb-4 last:mb-0"
                    ref={multiPage.setPageRef(pageNum)}
                    data-page-number={pageNum}
                  >
                    {isVisible ? (
                      <Page
                        pageNumber={pageNum}
                        width={width}
                        renderTextLayer={enableTextSelection}
                        renderAnnotationLayer={false}
                        devicePixelRatio={devicePixelRatio}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center bg-paper-50 border border-paper-200"
                        style={{ width, height: placeholderHeight }}
                      >
                        <span className="text-sm text-bridge-400">
                          Page {pageNum}
                        </span>
                      </div>
                    )}
                    <div className="text-center text-xs text-bridge-400 py-1 bg-paper-200">
                      Page {pageNum} of {totalPages}
                    </div>
                  </div>
                );
              })
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
        {/* Render overlays inside content area */}
        {children}

        {/* Processing gate overlay */}
        {scrollMode && deferLoading && !multiPage.isActivated && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-20">
            <div className="text-center">
              <div className="text-4xl mb-3 text-bridge-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm text-bridge-600 mb-1 font-medium">
                {totalPages} page{totalPages !== 1 ? 's' : ''} ready
              </p>
              <p className="text-xs text-bridge-400 mb-4">
                Pages load as you scroll
              </p>
              <button
                onClick={multiPage.activate}
                className="px-4 py-2 text-sm font-medium text-white bg-copper-500 rounded-lg hover:bg-copper-500 transition-colors shadow-sm"
              >
                Start Viewing
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Page navigation for PDFs - only show in single page mode */}
      {fileType === 'pdf' && totalPages > 1 && !scrollMode && (
        <div className="flex items-center justify-center gap-2 py-2 bg-paper-50 border-t border-paper-200">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-2 py-1 text-xs bg-white border border-paper-300 rounded hover:bg-paper-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <span className="text-xs text-bridge-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="px-2 py-1 text-xs bg-white border border-paper-300 rounded hover:bg-paper-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <span className="text-sm text-bridge-500">Loading...</span>
        </div>
      )}
    </div>
  );
}
