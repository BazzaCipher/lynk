// Any global or general types
import type { NodeProps } from '@xyflow/svelte'

export type FileNodeProps = NodeProps & {
    file: FileData
}

export interface FileData {
    type?: string, // MIME type
    ext?: string, // File extension
    src: string, // Can be relative, assumed URI
}