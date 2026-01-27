/**
 * Node Capabilities & Categories
 *
 * Nodes have orthogonal capabilities that compose freely:
 * - Exportable: Can produce data (has source/output handles) — stores outputs map
 * - Importable: Can receive data (has target/input handles)
 * - FileNodeData: Loads external files (display, extractor)
 *
 * A node can be Exportable, Importable, or both (e.g., CalculationNode, LabelNode).
 * Connection validation uses CanExport/CanImport capability helpers.
 */

import type { LynkNode, LynkNodeType } from './nodes';
import type { SimpleDataType } from './data';
import type { DataSourceReference } from './geometry';

// ═══════════════════════════════════════════════════════════════════════════════
// CAPABILITY INTERFACES (data contracts)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A single output value from a node handle.
 * Stored in Exportable.outputs keyed by handle ID.
 */
export interface NodeOutput {
  value: number | string | boolean | Date;
  dataType: SimpleDataType;
  label: string;
  source?: DataSourceReference | null;
}

/**
 * Data contract for nodes that can export data (have source/output handles).
 *
 * Each node component is responsible for populating `outputs` with current
 * computed values. The data flow resolver reads this map generically —
 * no per-node-type switch logic needed.
 */
export interface Exportable {
  outputs?: Record<string, NodeOutput>;
}

/**
 * Data contract for nodes that can import data (have target/input handles).
 *
 * Input resolution is handled by useDataFlow, which reads connected edges
 * and resolves source values from the source node's Exportable.outputs.
 */
export interface Importable {
  // Input resolution is edge-driven via useDataFlow
}

/** Data contract for file-backed nodes */
export interface FileNodeData {
  fileType: 'pdf' | 'image';
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
}

/** @deprecated Use FileNodeData instead */
export interface SourceNodeData {
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

/** File nodes - bring external files into the system */
export class FileNode {
  static readonly types: LynkNodeType[] = ['display', 'extractor'];

  static is(node: LynkNode): node is LynkNode & { data: FileNodeData } {
    return FileNode.types.includes(node.type as LynkNodeType);
  }

  static getFileId(node: LynkNode & { data: FileNodeData }): string | undefined {
    return node.data.fileId;
  }

  static getFileUrl(node: LynkNode & { data: FileNodeData }): string | undefined {
    return node.data.fileUrl;
  }

  static getFileName(node: LynkNode & { data: FileNodeData }): string | undefined {
    return node.data.fileName;
  }

  static filter(nodes: LynkNode[]): Array<LynkNode & { data: FileNodeData }> {
    return nodes.filter(FileNode.is);
  }
}

/** @deprecated Use FileNode instead */
export class SourceNode {
  static readonly types: LynkNodeType[] = ['display', 'extractor'];

  static is(node: LynkNode): node is LynkNode & { data: SourceNodeData } {
    return SourceNode.types.includes(node.type as LynkNodeType);
  }

  static getFileId(node: LynkNode & { data: SourceNodeData }): string | undefined {
    return node.data.fileId;
  }

  static getFileUrl(node: LynkNode & { data: SourceNodeData }): string | undefined {
    return node.data.fileUrl;
  }

  static getFileName(node: LynkNode & { data: SourceNodeData }): string | undefined {
    return node.data.fileName;
  }

  static filter(nodes: LynkNode[]): Array<LynkNode & { data: SourceNodeData }> {
    return nodes.filter(SourceNode.is);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPABILITY HELPERS (for connection validation)
// ═══════════════════════════════════════════════════════════════════════════════

/** Nodes that can be connection sources (have output handles) */
export const CanExport = {
  types: ['extractor', 'calculation', 'sheet', 'label'] as LynkNodeType[],
  is: (node: LynkNode) => CanExport.types.includes(node.type as LynkNodeType),
};

/** Nodes that can be connection targets (have input handles) */
export const CanImport = {
  types: ['calculation', 'sheet', 'label'] as LynkNodeType[],
  is: (node: LynkNode) => CanImport.types.includes(node.type as LynkNodeType),
};
