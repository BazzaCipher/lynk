/**
 * Viewport Types
 *
 * Defines viewport regions created by DisplayNode for cropped views.
 * Each viewport region spawns a connected ViewportNode on the canvas.
 */

import type { ViewRect } from './view';
import type { RegionCoordinates } from './geometry';

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWPORT REGION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A viewport region drawn on a document in DisplayNode.
 * Each region becomes a source handle and spawns a connected ViewportNode.
 */
export interface ViewportRegion {
  /** Unique ID, also used as source handle ID on the DisplayNode */
  id: string;
  /** Display label, e.g. "Viewport 1" */
  label: string;
  /** Normalized 0-1 coordinates for cropping */
  normalizedRect: ViewRect;
  /** Pixel coordinates at creation time (for overlay rendering) */
  pixelRect: RegionCoordinates;
  /** Page number for PDFs (1-based) */
  pageNumber: number;
}
