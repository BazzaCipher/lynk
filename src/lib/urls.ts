import type { FileData } from '$lib/types';
import { get as idbGet } from 'idb-keyval';

/** Create a blob: URL from FileData (OPFS, IDB, remote, objectUrl, fs). */
export async function toObjectUrl(fd: FileData): Promise<string> {
	switch (fd.src.kind) {
		case 'opfs': {
			const root: FileSystemDirectoryHandle = await navigator.storage.getDirectory();
			const parts = fd.src.path.split('/').filter(Boolean);
			const filename = parts.pop()!;
			let dir = root;
			for (const p of parts) {
			dir = await dir.getDirectoryHandle(p);
			}
			const fh = await dir.getFileHandle(filename);
			const file = await fh.getFile();
			return URL.createObjectURL(file);
		}

		case 'idb': {
			const blob = (await idbGet(fd.src.key)) as Blob | undefined;
			if (!blob) throw new Error('Blob not found in IDB for key: ' + fd.src.key);
			return URL.createObjectURL(blob);
		}

		case 'remote': {
			// You can either return the remote URL directly, or first fetch & cache.
			// For read-only viewing in an <iframe>, returning the remote URL is fine.
			return fd.src.url;
		}

		case 'objectUrl': {
			// Already a blob: URL. Do not revoke here; the creator should manage its lifecycle.
			return fd.src.url;
		}

		case 'fs': {
			// Read current file bytes via File System Access handle (read-only)
			const file = await fd.src.handle.getFile();
			return URL.createObjectURL(file);
		}

		default:
		// Exhaustiveness guard
		// @ts-expect-error
		throw new Error(`Unsupported FileLocation kind: ${fd.src.kind}`);
	}
}

/** Convenience: get an actual File object from FileData (when a component wants a `File`). */
export async function resolveFile(fd: FileData): Promise<File> {
	switch (fd.src.kind) {
		case 'opfs': {
			const root: FileSystemDirectoryHandle = await navigator.storage.getDirectory();
			const parts = fd.src.path.split('/').filter(Boolean);
			const filename = parts.pop()!;
			let dir = root;
			for (const p of parts) {
				dir = await dir.getDirectoryHandle(p);
			}
			const fh = await dir.getFileHandle(filename);
			return fh.getFile();
		}

		case 'idb': {
			const blob = (await idbGet(fd.src.key)) as Blob | undefined;
			if (!blob) throw new Error('Blob not found in IDB for key: ' + fd.src.key);
			return new File([blob], fd.name, { type: fd.type });
		}

		case 'remote': {
			const res = await fetch(fd.src.url);
			const blob = await res.blob();
			return new File([blob], fd.name, { type: blob.type || fd.type });
		}

		case 'objectUrl': {
			throw new Error('Cannot resolve File from objectUrl without original Blob.');
		}

		case 'fs': {
			return fd.src.handle.getFile();
		}

		default:
			// @ts-expect-error
			throw new Error(`Unsupported FileLocation kind: ${fd.src.kind}`);
	  }
}

