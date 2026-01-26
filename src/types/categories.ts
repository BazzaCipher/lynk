/**
 * Node Categories
 *
 * Nodes are divided into two mutually exclusive categories based on data source:
 * - Source: Entry points - data comes from files/external links (no input handles)
 * - Transform: Processors - data comes from other nodes via edges (has input handles)
 */

import type { LynkNode, LynkNodeType } from './nodes';

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY INTERFACES (data contracts)
// ═══════════════════════════════════════════════════════════════════════════════

/** Data contract for Source nodes - external data entry points */
export interface SourceNodeData {
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
}

/** Data contract for Transform nodes - edge-based processing */
export interface TransformNodeData {
  // Transform nodes receive data via edges, not stored in data
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

/** Source nodes - bring external data into the system */
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

/** Transform nodes - process data from connected edges */
export class TransformNode {
  static readonly types: LynkNodeType[] = ['calculation', 'sheet', 'label'];

  static is(node: LynkNode): node is LynkNode & { data: TransformNodeData } {
    return TransformNode.types.includes(node.type as LynkNodeType);
  }

  static filter(nodes: LynkNode[]): Array<LynkNode & { data: TransformNodeData }> {
    return nodes.filter(TransformNode.is);
  }
}
