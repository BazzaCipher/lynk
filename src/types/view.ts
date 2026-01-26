/**
 * Document View Types
 *
 * A flexible viewport system that works across document types (PDFs, images, spreadsheets, etc.).
 * Used by DisplayNode to define what portion of a document is shown.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW RECTANGLE
// ═══════════════════════════════════════════════════════════════════════════════

/** Rectangular region within a document (normalized 0-1 coordinates) */
export interface ViewRect {
  /** Left offset (0 = left edge, 1 = right edge) */
  x: number;
  /** Top offset (0 = top edge, 1 = bottom edge) */
  y: number;
  /** Viewport width (1 = full width) */
  width: number;
  /** Viewport height (1 = full height) */
  height: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW TARGET
// ═══════════════════════════════════════════════════════════════════════════════

/** What part of the document we're viewing */
export type ViewTarget =
  | { type: 'page'; pageNumber: number }           // PDF page
  | { type: 'image' }                              // Full image
  | { type: 'sheet'; sheetName: string }           // Excel sheet (future)
  | { type: 'slide'; slideNumber: number }         // Slides (future)
  | { type: 'range'; sheet: string; range: string }; // Excel range (future)

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT VIEW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Represents a rectangular viewport into a document.
 * Extensible for PDFs, images, spreadsheets, etc.
 */
export interface DocumentView {
  /** Viewport rectangle in document coordinates (0-1 normalized) */
  viewport: ViewRect;
  /** Which page/sheet/slide is being viewed */
  target: ViewTarget;
  /** Node display size (how big the node renders on canvas) */
  nodeSize: { width: number; height: number };
  /** Lock aspect ratio when resizing */
  aspectLocked: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default view showing entire first page/image */
export const DEFAULT_VIEW: DocumentView = {
  viewport: { x: 0, y: 0, width: 1, height: 1 },  // Full document
  target: { type: 'page', pageNumber: 1 },
  nodeSize: { width: 400, height: 300 },
  aspectLocked: true,
};

/** Create a default view for an image */
export function createImageView(width: number = 300, height: number = 200): DocumentView {
  return {
    viewport: { x: 0, y: 0, width: 1, height: 1 },
    target: { type: 'image' },
    nodeSize: { width, height },
    aspectLocked: true,
  };
}

/** Create a default view for a PDF page */
export function createPdfView(pageNumber: number = 1, width: number = 400, height: number = 300): DocumentView {
  return {
    viewport: { x: 0, y: 0, width: 1, height: 1 },
    target: { type: 'page', pageNumber },
    nodeSize: { width, height },
    aspectLocked: true,
  };
}
