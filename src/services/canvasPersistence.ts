/**
 * Canvas Persistence Service
 *
 * Standalone functions for canvas import/export and file I/O.
 */

import type { LynkNode, CanvasState } from '../types';
import { CanvasStateSchema } from '../schemas/canvas';
import { clearLocalStorageDraft } from '../hooks/useLocalStorageSync';
import { defaultPipeline, type ValidationResult, type ExportedCanvas } from '../store/codecs';
import { setNodeIdCounter } from '../store/slices/coreSlice';

export type { ValidationResult };

export interface CanvasData {
  nodes: LynkNode[];
  edges: import('@xyflow/react').Edge[];
  viewport: import('@xyflow/react').Viewport;
  canvasName: string;
  canvasId: string;
  lastSaved: string | null;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  data?: CanvasData;
}

export interface SaveResult {
  success: boolean;
  warnings: string[];
}

/**
 * Export canvas state to a serializable object
 */
export function exportCanvas(data: CanvasData): CanvasState {
  const now = new Date().toISOString();
  return {
    version: '1.0.0',
    metadata: {
      id: data.canvasId,
      name: data.canvasName,
      createdAt: data.lastSaved || now,
      updatedAt: now,
    },
    nodes: data.nodes,
    edges: data.edges,
    viewport: data.viewport,
  };
}

/**
 * Import and validate canvas state
 */
export function importCanvas(state: ExportedCanvas): ImportResult {
  const result = CanvasStateSchema.safeParse(state);
  if (!result.success) {
    // Include field paths in error message for debugging
    const errors = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    return {
      success: false,
      error: `Invalid canvas file: ${errors}`,
    };
  }

  const validState = result.data;
  const { canvas: restoredState, warnings } = defaultPipeline.import(validState as ExportedCanvas);

  if (warnings.length > 0) {
    console.warn('Canvas import warnings:', warnings);
  }

  // Find highest node ID to continue from
  let maxNodeId = 0;
  for (const node of restoredState.nodes) {
    const match = node.id.match(/^node-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNodeId) maxNodeId = num;
    }
  }
  setNodeIdCounter(maxNodeId);

  return {
    success: true,
    data: {
      nodes: restoredState.nodes as LynkNode[],
      edges: restoredState.edges,
      viewport: restoredState.viewport,
      canvasName: restoredState.metadata.name,
      canvasId: restoredState.metadata.id,
      lastSaved: restoredState.metadata.updatedAt,
    },
  };
}

/**
 * Validate canvas for export
 */
export function validateCanvas(data: CanvasData): ValidationResult {
  const state = exportCanvas(data);
  return defaultPipeline.validate(state);
}

/**
 * Save canvas to file (triggers download)
 */
export async function saveToFile(data: CanvasData): Promise<SaveResult> {
  const state = exportCanvas(data);

  const validation = defaultPipeline.validate(state);
  if (!validation.valid) {
    console.error('Canvas validation failed:', validation.errors);
    return { success: false, warnings: validation.errors };
  }

  const { canvas: exportedCanvas, warnings: exportWarnings } = await defaultPipeline.export(state);
  const allWarnings = [...validation.warnings, ...exportWarnings];

  const json = JSON.stringify(exportedCanvas, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.metadata.name.replace(/[^a-z0-9]/gi, '_')}.lynk.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  clearLocalStorageDraft();

  return { success: true, warnings: allWarnings };
}

/**
 * Load canvas from file (triggers file picker)
 */
export function loadFromFile(): Promise<ImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.lynk.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve({ success: false, error: 'No file selected' });
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        resolve(importCanvas(data));
      } catch (err) {
        resolve({
          success: false,
          error: `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    };

    input.oncancel = () => {
      resolve({ success: false, error: 'File selection cancelled' });
    };

    input.click();
  });
}
