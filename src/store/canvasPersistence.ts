/**
 * Canvas Persistence
 *
 * Handles saving and loading canvas state, including:
 * - File embedding (converting blob URLs to base64 for export)
 * - File extraction (converting base64 back to blob URLs on import)
 * - Blob URL registry for tracking files in memory
 */

import type { CanvasState, EmbeddedFile, LynkNode, FileNodeData, ImageNodeData } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// BLOB REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry tracking blob URLs and their associated file data.
 * Allows converting between runtime blob URLs and persistable base64.
 */
export const BlobRegistry = {
  // Maps fileId -> blob data
  blobs: new Map<string, Blob>() as Map<string, Blob>,
  // Maps blobUrl -> fileId (reverse lookup)
  urlToId: new Map<string, string>() as Map<string, string>,
  // Maps fileId -> blobUrl
  idToUrl: new Map<string, string>() as Map<string, string>,

  generateId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  },

  register(blob: Blob): { fileId: string; blobUrl: string } {
    const fileId = this.generateId();
    const blobUrl = URL.createObjectURL(blob);

    this.blobs.set(fileId, blob);
    this.urlToId.set(blobUrl, fileId);
    this.idToUrl.set(fileId, blobUrl);

    return { fileId, blobUrl };
  },

  getIdFromUrl(blobUrl: string): string | undefined {
    return this.urlToId.get(blobUrl);
  },

  getUrlFromId(fileId: string): string | undefined {
    return this.idToUrl.get(fileId);
  },

  getBlob(fileId: string): Blob | undefined {
    return this.blobs.get(fileId);
  },

  clear(): void {
    for (const url of this.urlToId.keys()) {
      URL.revokeObjectURL(url);
    }
    this.blobs.clear();
    this.urlToId.clear();
    this.idToUrl.clear();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// BASE64 CONVERSION
// ═══════════════════════════════════════════════════════════════════════════════

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Extract base64 portion after "data:mime/type;base64,"
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS EXPORTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prepares canvas state for export by embedding all files as base64.
 */
export const CanvasExporter = {
  /**
   * Collect all file IDs from FileNodes and ImageNodes in the canvas
   */
  collectFileIds(nodes: LynkNode[]): string[] {
    const fileIds: string[] = [];
    for (const node of nodes) {
      if (node.type === 'file') {
        const data = node.data as FileNodeData;
        if (data.fileId) {
          fileIds.push(data.fileId);
        }
      } else if (node.type === 'image') {
        const data = node.data as ImageNodeData;
        if (data.fileId) {
          fileIds.push(data.fileId);
        }
      }
    }
    return fileIds;
  },

  /**
   * Convert blobs to embedded files for export
   */
  async embedFiles(fileIds: string[]): Promise<Record<string, EmbeddedFile>> {
    const embedded: Record<string, EmbeddedFile> = {};

    for (const fileId of fileIds) {
      const blob = BlobRegistry.getBlob(fileId);
      if (!blob) {
        console.warn(`CanvasExporter: file ${fileId} not found in registry`);
        continue;
      }

      try {
        const base64 = await blobToBase64(blob);
        embedded[fileId] = {
          filename: fileId,
          mimeType: blob.type || 'application/octet-stream',
          data: base64,
        };
      } catch (err) {
        console.warn(`CanvasExporter: failed to embed file ${fileId}:`, err);
      }
    }

    return embedded;
  },

  /**
   * Export canvas with all files embedded
   */
  async exportWithEmbeddedFiles(canvas: CanvasState): Promise<CanvasState> {
    const fileIds = this.collectFileIds(canvas.nodes);
    const embeddedFiles = await this.embedFiles(fileIds);

    return {
      ...canvas,
      embeddedFiles: Object.keys(embeddedFiles).length > 0 ? embeddedFiles : undefined,
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS IMPORTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Restores canvas state from export by extracting embedded files.
 */
export const CanvasImporter = {
  /**
   * Extract embedded files to blob URLs and register in BlobRegistry
   */
  extractFiles(embeddedFiles: Record<string, EmbeddedFile>): Record<string, string> {
    const fileIdToUrl: Record<string, string> = {};

    for (const [fileId, file] of Object.entries(embeddedFiles)) {
      try {
        const blob = base64ToBlob(file.data, file.mimeType);
        const blobUrl = URL.createObjectURL(blob);

        BlobRegistry.blobs.set(fileId, blob);
        BlobRegistry.urlToId.set(blobUrl, fileId);
        BlobRegistry.idToUrl.set(fileId, blobUrl);

        fileIdToUrl[fileId] = blobUrl;
      } catch (err) {
        console.warn(`CanvasImporter: failed to extract file ${fileId}:`, err);
      }
    }

    return fileIdToUrl;
  },

  /**
   * Restore blob URLs in FileNodes and ImageNodes from embedded files
   */
  restoreFileUrls(nodes: LynkNode[], fileIdToUrl: Record<string, string>): LynkNode[] {
    return nodes.map((node) => {
      if (node.type === 'file') {
        const data = node.data as FileNodeData;
        if (!data.fileId) return node;

        const blobUrl = fileIdToUrl[data.fileId];
        if (!blobUrl) {
          console.warn(`CanvasImporter: no blob URL for file ${data.fileId}`);
          return node;
        }

        return {
          ...node,
          data: {
            ...data,
            fileUrl: blobUrl,
          },
        };
      }

      if (node.type === 'image') {
        const data = node.data as ImageNodeData;
        if (!data.fileId) return node;

        const blobUrl = fileIdToUrl[data.fileId];
        if (!blobUrl) {
          console.warn(`CanvasImporter: no blob URL for image ${data.fileId}`);
          return node;
        }

        return {
          ...node,
          data: {
            ...data,
            imageUrl: blobUrl,
          },
        };
      }

      return node;
    }) as LynkNode[];
  },

  /**
   * Import canvas and restore all file references
   */
  importWithExtractedFiles(canvas: CanvasState): CanvasState {
    if (!canvas.embeddedFiles || Object.keys(canvas.embeddedFiles).length === 0) {
      return canvas;
    }

    const fileIdToUrl = this.extractFiles(canvas.embeddedFiles);
    const restoredNodes = this.restoreFileUrls(canvas.nodes, fileIdToUrl);

    return {
      ...canvas,
      nodes: restoredNodes,
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validates canvas before export
 */
export const CanvasValidator = {
  validateForExport(canvas: CanvasState): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const node of canvas.nodes) {
      if (node.type === 'file') {
        const data = node.data as FileNodeData;

        // Check if file has URL but no fileId (blob URL that won't persist)
        if (data.fileUrl && !data.fileId) {
          warnings.push(
            `FileNode "${data.label}" has a file loaded but it won't be saved. ` +
            `Re-import the file to include it in the export.`
          );
        }

        // Check if file has fileId but blob not in registry
        if (data.fileId && !BlobRegistry.getBlob(data.fileId)) {
          errors.push(
            `FileNode "${data.label}" references file ${data.fileId} but file data is missing.`
          );
        }
      }

      if (node.type === 'image') {
        const data = node.data as ImageNodeData;

        // Check if image has URL but no fileId (blob URL that won't persist)
        if (data.imageUrl && !data.fileId) {
          warnings.push(
            `ImageNode "${data.label}" has an image loaded but it won't be saved. ` +
            `Re-import the image to include it in the export.`
          );
        }

        // Check if image has fileId but blob not in registry
        if (data.fileId && !BlobRegistry.getBlob(data.fileId)) {
          errors.push(
            `ImageNode "${data.label}" references file ${data.fileId} but file data is missing.`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  },
};
