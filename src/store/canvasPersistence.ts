/**
 * Canvas Persistence
 *
 * Blob URL registry for tracking files in memory.
 * Export/import logic has moved to src/store/codecs/.
 */

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
