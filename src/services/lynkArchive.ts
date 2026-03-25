/**
 * .lynk Archive Format
 *
 * A .lynk file is a ZIP archive containing:
 *   manifest.json     - canvas state (metadata, nodes, edges, viewport, version)
 *   files/<id>.bin     - raw binary file data (PDFs, images)
 *
 * The manifest's `files` section maps fileId → metadata (filename, mimeType, size, hash).
 * Actual file bytes live as separate entries for efficient storage (no base64 bloat).
 *
 * Format version is tracked in manifest.formatVersion for future migrations.
 */

import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

/** Per-file metadata stored in the manifest */
export interface LynkFileEntry {
  filename: string;
  mimeType: string;
  size?: number;
  contentHash?: string;
  folderId?: string;
}

/** The manifest.json structure inside a .lynk archive */
export interface LynkManifest {
  /** Archive format version - bump when layout changes */
  formatVersion: 1;
  /** Canvas state version (semver) */
  version: string;
  metadata: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  nodes: unknown[];
  edges: unknown[];
  viewport: { x: number; y: number; zoom: number };
  /** File metadata keyed by fileId. Binary data lives in files/<id>.bin */
  files: Record<string, LynkFileEntry>;
  /** Virtual folder hierarchy for file organization */
  virtualFolders?: { id: string; name: string; parentId: string | null }[];
}

export interface PackInput {
  manifest: Omit<LynkManifest, 'files'>;
  files: Map<string, { meta: LynkFileEntry; data: Uint8Array }>;
}

/**
 * Pack a canvas + files into a .lynk archive (ZIP bytes).
 */
export function packLynk(input: PackInput): Uint8Array {
  const filesRecord: Record<string, LynkFileEntry> = {};
  const zipEntries: Record<string, Uint8Array> = {};

  for (const [fileId, { meta, data }] of input.files) {
    filesRecord[fileId] = meta;
    zipEntries[`files/${fileId}.bin`] = data;
  }

  const manifest: LynkManifest = {
    ...input.manifest,
    files: filesRecord,
  };

  zipEntries['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));

  return zipSync(zipEntries, { level: 6 });
}

export interface UnpackResult {
  manifest: LynkManifest;
  files: Map<string, Uint8Array>;
}

/**
 * Unpack a .lynk archive (ZIP bytes) into manifest + file data.
 */
export function unpackLynk(data: Uint8Array): UnpackResult {
  const entries = unzipSync(data);

  const manifestBytes = entries['manifest.json'];
  if (!manifestBytes) {
    throw new Error('Invalid .lynk file: missing manifest.json');
  }

  const manifest: LynkManifest = JSON.parse(strFromU8(manifestBytes));

  if (!manifest.formatVersion) {
    throw new Error('Invalid .lynk file: missing formatVersion in manifest');
  }

  const files = new Map<string, Uint8Array>();
  for (const [path, bytes] of Object.entries(entries)) {
    const match = path.match(/^files\/(.+)\.bin$/);
    if (match) {
      files.set(match[1], bytes);
    }
  }

  return { manifest, files };
}
