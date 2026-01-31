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
// CANVAS STATE
// ═══════════════════════════════════════════════════════════════════════════════

/** Canvas state for persistence */
export interface CanvasState {
  version: string;
  metadata: CanvasMetadata;
  nodes: LynkNode[];
  edges: Edge[];
  viewport: Viewport;
  /** Codec-managed embedded data (files, etc.) */
  embedded?: Record<string, unknown>;
}
