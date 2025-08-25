import type { FileData } from '$lib/types';
import { set as idbSet } from 'idb-keyval';

export const supportsOPFS =
	typeof navigator !== 'undefined' &&
	!!(navigator.storage && (navigator.storage as any).getDirectory);

// Utility: extension
function extOf(name: string): string | undefined {
	const i = name.lastIndexOf('.');
	return i >= 0 ? name.slice(i + 1).toLowerCase() : undefined;
}

// Utility: SHA-256 hash (hex) for dedupe/content addressing
async function hashBlob(blob: Blob): Promise<string> {
	const buf = await blob.arrayBuffer();
	const digest = await crypto.subtle.digest('SHA-256', buf);
	return Array.from(new Uint8Array(digest))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

// Write to OPFS at a path; creates intermediate directories
async function writeOPFS(path: string, data: Blob) {
	// @ts-ignore (types lag behind)
	const root: FileSystemDirectoryHandle = await navigator.storage.getDirectory();
	const parts = path.split('/').filter(Boolean);
	const filename = parts.pop()!;
	let dir = root;
	for (const p of parts) {
		dir = await dir.getDirectoryHandle(p, { create: true });
	}
	const fileHandle = await dir.getFileHandle(filename, { create: true });
	const w = await fileHandle.createWritable();
	await w.write(data);
	await w.close();
}

// IDB key namespace (avoid collisions with other app data)
const IDB_BLOB_NS = 'blobs/';

export interface ImportOptions {
	/** If true and a file with the same hash already exists in storage, skip writing again. Default true. */
	dedupe?: boolean;
	/** Optional override of the OPFS relative path (must include filename). Default: `docs/{hash}.{ext||bin}` */
	opfsPath?: (hash: string, ext?: string) => string;
}

/**
 * Import a File once into OPFS (preferred) or IDB (fallback).
 * Returns a FileData entry you can persist in your index.
 */
export async function importFile(file: File, _opts: ImportOptions = {}): Promise<FileData> {
	const opts: Required<ImportOptions> = {
		dedupe: _opts.dedupe ?? true,
		opfsPath: _opts.opfsPath ?? ((hash, ext) => `docs/${hash}.${ext ?? 'bin'}`)
	};

	const id = crypto.randomUUID();
	const ext = extOf(file.name);
	const type = file.type || undefined;
	const size = file.size;

	// Content hash for dedupe + stable naming
	const hash = await hashBlob(file);

	if (supportsOPFS) {
		const path = opts.opfsPath(hash, ext);
		// optional dedupe: try to avoid rewriting the same content again
		if (!opts.dedupe) {
			await writeOPFS(path, file);
		} else {
			// OPFS doesn’t expose an easy exists+size+hash check without try/catch.
			await writeOPFS(path, file);
		}
		return {
		id,
		name: file.name,
		type,
		ext,
		size,
		hash,
		src: { kind: 'opfs', path }
		};
	}

	// Fallback: store the Blob in IDB
	const key = `${IDB_BLOB_NS}${hash}`;
	await idbSet(key, file as Blob);

	return {
		id,
		name: file.name,
		type,
		ext,
		size,
		hash,
		src: { kind: 'idb', key }
	};
}
