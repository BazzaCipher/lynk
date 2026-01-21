import type { Node, Edge, Viewport } from '@xyflow/react';

// Node type identifiers
export type LynkNodeType = 'file' | 'calculation' | 'sheet' | 'label';

// Simple data types
export type SimpleDataType = 'string' | 'number' | 'boolean' | 'date' | 'currency';

// Type-safe simple values
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

// Core data value type with source tracking (legacy support)
export interface DataValue {
  type: 'number' | 'text' | 'date' | 'array' | 'table';
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

// Calculation node specific data
export interface CalculationNodeData extends BaseNodeData {
  operation: 'sum' | 'average' | 'min' | 'max' | 'count';
  precision: number;
  inputs: DataValue[];
  result?: DataValue;
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

// Label node specific data
export interface LabelNodeData extends BaseNodeData {
  format: 'number' | 'currency' | 'date' | 'text';
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
