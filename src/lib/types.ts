// Any global or general types
import type { NodeProps } from '@xyflow/svelte'

export type FileNodeProps = NodeProps & {
    file: FileData
}

export type FileLocation =
	| { kind: 'idb'; key: string }        // blob lives in IndexedDB under this key
	| { kind: 'remote'; url: string }     // downloadable URL (CDN, S3, etc)
	| { kind: 'objectUrl'; url: string }  // ephemeral (never persist across reloads)
	| { kind: 'opfs'; path: string }      // canonical, non-dangling
	| { kind: 'fs'; handle: FileSystemFileHandle }; // File System Access API (optional)

export interface FileData {
	id: string, // stable ID
    name: string, // Name of the file
    type?: string, // MIME type
    ext?: string, // File extension
    src: FileLocation, // Location of file
	size?: number,
	hash?: string; // optional content hash for dedupe
}

// Interface for each Viewer plugin to accept
export interface ViewerProps {
  file: File;
  onClose?: () => void;
}

// Interface for for modal to consume
export interface ViewerPlugin {
	supports: (file: FileData) => boolean;
	load: () => Promise< { default: any }> // Async for optimisation purposes
}

