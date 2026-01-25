/**
 * Node Types
 *
 * Defines all node types for the canvas graph including
 * file, calculation, sheet, and label nodes.
 */

import type { Node } from '@xyflow/react';
import type { DataValue, SimpleDataType } from './data';
import type { DataSourceReference } from './geometry';
import type { ExtractedRegion } from './regions';

// ═══════════════════════════════════════════════════════════════════════════════
// NODE TYPE IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

export type LynkNodeType = 'file' | 'calculation' | 'sheet' | 'label' | 'image';

// ═══════════════════════════════════════════════════════════════════════════════
// BASE NODE DATA
// ═══════════════════════════════════════════════════════════════════════════════

/** Base node data that all nodes share */
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE NODE
// ═══════════════════════════════════════════════════════════════════════════════

/** File node specific data */
export interface FileNodeData extends BaseNodeData {
  fileType: 'pdf' | 'image';
  fileName?: string;
  /** Runtime blob URL - not persisted, regenerated from embedded file on load */
  fileUrl?: string;
  /** Reference to embedded file in CanvasState.embeddedFiles */
  fileId?: string;
  regions: ExtractedRegion[];
  currentPage: number;
  totalPages: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULATION NODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cached input state for an operation.
 * Stores edge connections so they can be restored when switching back to this operation.
 */
export interface CachedOperationInputs {
  /** The operation this cache is for */
  operationId: string;
  /** Edge IDs that were connected */
  edgeIds: string[];
  /** Timestamp of when this was cached */
  cachedAt: string;
}

/**
 * Result from a calculation operation with type information.
 * The dataType may differ from inputs (e.g., count returns number regardless of input types).
 */
export interface CalculationResult {
  /** The computed value */
  value: number | string | Date;
  /** The data type of the result (determines output handle color) */
  dataType: SimpleDataType;
  /** Optional source tracking for provenance */
  source?: DataSourceReference;
}

/**
 * Calculation node specific data.
 * Uses extensible operation IDs from the operation registry.
 */
export interface CalculationNodeData extends BaseNodeData {
  /** Operation ID - references operationRegistry (e.g., 'sum', 'max', 'round') */
  operation: string;
  /** Decimal precision for result display */
  precision: number;
  /** Input values (resolved from edges) - computed, not persisted */
  inputs: DataValue[];
  /** Computed result with type information */
  result?: CalculationResult;
  /**
   * Cached inputs per operation.
   * When user switches operations, we store current connections here.
   * If they switch back, compatible connections can be restored.
   */
  inputCache?: Record<string, CachedOperationInputs>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET NODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sheet entry - like a mini CalculationNode within a SheetNode.
 * Accepts multiple inputs, applies an operation, outputs the result.
 */
export interface SheetEntry {
  id: string;
  label: string;
  /** Operation ID from registry (default: 'sum') */
  operation: string;
  /** Show/hide connected inputs (like CalculationNode) */
  expanded?: boolean;
}

/**
 * Sheet subheader - groups entries and aggregates their outputs.
 */
export interface SheetSubheader {
  id: string;
  label: string;
  /** Operation ID from registry (default: 'sum') */
  operation: string;
  entries: SheetEntry[];
  /** Collapse entire subheader */
  collapsed?: boolean;
}

/**
 * Computed result for an entry or subheader.
 */
export interface SheetComputedResult {
  value: number | string | Date;
  dataType: SimpleDataType;
}

/** Sheet node specific data */
export interface SheetNodeData extends BaseNodeData {
  subheaders: SheetSubheader[];
  /** Computed entry results (for entry output handles) - runtime only */
  entryResults?: Record<string, SheetComputedResult | null>;
  /** Computed subheader results (for subheader output handles) - runtime only */
  subheaderResults?: Record<string, SheetComputedResult | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL NODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Display format options for label nodes.
 * Note: 'text' is kept for backward compatibility, treated as 'string'.
 */
export type LabelFormat = 'number' | 'currency' | 'date' | 'string';

/** Label node specific data */
export interface LabelNodeData extends BaseNodeData {
  format: LabelFormat;
  value?: DataValue;
  fontSize: 'small' | 'medium' | 'large';
  alignment: 'left' | 'center' | 'right';
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE NODE
// ═══════════════════════════════════════════════════════════════════════════════

/** Image node specific data - display-only visual reference */
export interface ImageNodeData extends BaseNodeData {
  /** Runtime blob URL - not persisted, regenerated from embedded file on load */
  imageUrl?: string;
  /** Reference to embedded file in CanvasState.embeddedFiles */
  fileId?: string;
  /** Original file name */
  fileName?: string;
  /** Display width in pixels */
  width: number;
  /** Display height in pixels */
  height: number;
  /** Whether aspect ratio is locked during resize */
  aspectLocked: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NODE DATA UNION
// ═══════════════════════════════════════════════════════════════════════════════

/** Union type for all node data types */
export type LynkNodeData =
  | FileNodeData
  | CalculationNodeData
  | SheetNodeData
  | LabelNodeData
  | ImageNodeData;

// ═══════════════════════════════════════════════════════════════════════════════
// REACT FLOW NODE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Typed React Flow nodes */
export type FileNode = Node<FileNodeData, 'file'>;
export type CalculationNode = Node<CalculationNodeData, 'calculation'>;
export type SheetNode = Node<SheetNodeData, 'sheet'>;
export type LabelNode = Node<LabelNodeData, 'label'>;
export type ImageNode = Node<ImageNodeData, 'image'>;

/** Union type for all node types */
export type LynkNode = FileNode | CalculationNode | SheetNode | LabelNode | ImageNode;
