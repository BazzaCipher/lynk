/**
 * Canvas State Types
 *
 * Defines the structure for canvas persistence and serialization.
 */

import type { Edge, Viewport } from '@xyflow/react';
import type { LynkNode } from './nodes';

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS METADATA
// ═══════════════════════════════════════════════════════════════════════════════

/** Canvas metadata for identification and timestamps */
export interface CanvasMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMBEDDED FILES
// ═══════════════════════════════════════════════════════════════════════════════

/** Embedded file data for complete export */
export interface EmbeddedFile {
  filename: string;
  mimeType: string;
  /** Base64-encoded file content */
  data: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS STATE
// ═══════════════════════════════════════════════════════════════════════════════

/** Canvas state for persistence */
export interface CanvasState {
  version: string;
  metadata: CanvasMetadata;
  nodes: LynkNode[];
  edges: Edge[];
  viewport: Viewport;
  /** Embedded files for complete export (PDFs, images used in FileNodes) */
  embeddedFiles?: Record<string, EmbeddedFile>;
}
