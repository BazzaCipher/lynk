import type { Node, Edge, Viewport } from '@xyflow/react';

// Node type identifiers
export type LynkNodeType = 'file' | 'calculation' | 'sheet' | 'label';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED DATA TYPE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Core data types for simple values.
 * Used throughout the application for region data types and calculations.
 */
export type SimpleDataType = 'string' | 'number' | 'boolean' | 'date' | 'currency';

/**
 * Extended data types including complex/aggregate types.
 * Used by DataValue for nested structures.
 */
export type ExtendedDataType = SimpleDataType | 'array' | 'table';

/**
 * Legacy type alias - 'text' maps to 'string'.
 * @deprecated Use 'string' instead. Kept for backward compatibility with saved canvases.
 */
export type LegacyTextType = 'text';

/**
 * All data types including legacy aliases.
 * Use this for parsing/validation, then normalize to ExtendedDataType.
 */
export type AnyDataType = ExtendedDataType | LegacyTextType;

/**
 * Normalize legacy type names to current types.
 * Converts 'text' → 'string'.
 */
export function normalizeDataType(type: AnyDataType): ExtendedDataType {
  if (type === 'text') return 'string';
  return type;
}

/**
 * Type guard to check if a type is a simple (non-aggregate) data type.
 */
export function isSimpleDataType(type: AnyDataType): type is SimpleDataType {
  const normalized = normalizeDataType(type);
  return ['string', 'number', 'boolean', 'date', 'currency'].includes(normalized);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE-SAFE SIMPLE VALUES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StringValue {
  type: 'string';
  value: string;
}

export interface NumberValue {
  type: 'number';
  value: number;
  precision?: number;
}

export interface BooleanValue {
  type: 'boolean';
  value: boolean;
}

export interface DateValue {
  type: 'date';
  value: string; // ISO date string
}

export interface CurrencyValue {
  type: 'currency';
  value: number;
  currency: string; // e.g., 'USD', 'EUR'
}

export type SimpleValue = StringValue | NumberValue | BooleanValue | DateValue | CurrencyValue;

// Region coordinates for box selections
export interface RegionCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Text range for text selections
export interface TextRange {
  startOffset: number;
  endOffset: number;
  text: string;
  rects: RegionCoordinates[]; // Bounding rectangles for visual highlighting
}

// Selection types
export type SelectionType = 'box' | 'text';

// Source tracking for data provenance
export interface DataSourceReference {
  nodeId: string;
  regionId: string;
  pageNumber?: number;
  coordinates?: RegionCoordinates;
  textRange?: TextRange;
  extractionMethod: 'manual' | 'ocr' | 'ai';
  confidence?: number;
}

/**
 * Core data value type with source tracking.
 *
 * Note: The 'type' field may contain legacy value 'text' which should be treated as 'string'.
 * Use normalizeDataType() when comparing types.
 */
export interface DataValue {
  type: ExtendedDataType | LegacyTextType;
  value: number | string | Date | DataValue[];
  source?: DataSourceReference;
}

// Extracted region from a file node
export interface ExtractedRegion {
  id: string;
  label: string;
  selectionType: SelectionType;
  coordinates?: RegionCoordinates; // For box selections
  textRange?: TextRange; // For text selections
  pageNumber: number;
  extractedData: DataValue;
  dataType: SimpleDataType; // User-specified data type
  color: string;
  valueCache?: Partial<Record<SimpleDataType, string>>; // Cached values per data type
}

// Base node data that all nodes share
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
}

// File node specific data
export interface FileNodeData extends BaseNodeData {
  fileType: 'pdf' | 'image';
  fileName?: string;
  fileUrl?: string;
  regions: ExtractedRegion[];
  currentPage: number;
  totalPages: number;
}

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

// Sheet column definition
export interface SheetColumn {
  id: string;
  header: string;
  subheader?: string;
  aggregation: 'sum' | 'average' | 'min' | 'max' | 'count' | 'none';
}

// Sheet node specific data
export interface SheetNodeData extends BaseNodeData {
  columns: SheetColumn[];
  rows: DataValue[][];
}

/**
 * Display format options for label nodes.
 * Note: 'text' is kept for backward compatibility, treated as 'string'.
 */
export type LabelFormat = 'number' | 'currency' | 'date' | 'text';

// Label node specific data
export interface LabelNodeData extends BaseNodeData {
  format: LabelFormat;
  value?: DataValue;
  fontSize: 'small' | 'medium' | 'large';
  alignment: 'left' | 'center' | 'right';
}

// Union type for all node data types
export type LynkNodeData =
  | FileNodeData
  | CalculationNodeData
  | SheetNodeData
  | LabelNodeData;

// Typed nodes for React Flow
export type FileNode = Node<FileNodeData, 'file'>;
export type CalculationNode = Node<CalculationNodeData, 'calculation'>;
export type SheetNode = Node<SheetNodeData, 'sheet'>;
export type LabelNode = Node<LabelNodeData, 'label'>;

// Union type for all node types
export type LynkNode = FileNode | CalculationNode | SheetNode | LabelNode;

// Canvas state for persistence
export interface CanvasState {
  version: string;
  metadata: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  nodes: LynkNode[];
  edges: Edge[];
  viewport: Viewport;
}
