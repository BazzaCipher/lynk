/**
 * Type System Index
 *
 * Re-exports all types from modular files for convenient importing.
 * Import from '../types' to access any type.
 */

// Data types and values
export type {
  SimpleDataType,
  ExtendedDataType,
  LegacyTextType,
  AnyDataType,
  StringValue,
  NumberValue,
  BooleanValue,
  DateValue,
  CurrencyValue,
  SimpleValue,
  DataValue,
} from './data';

export { normalizeDataType, isSimpleDataType } from './data';

// Geometry and selection types
export type {
  RegionCoordinates,
  TextRange,
  SelectionType,
  DataSourceReference,
} from './geometry';

// Extracted regions
export type { ExtractedRegion } from './regions';

// View types
export type {
  ViewRect,
  ViewTarget,
  DocumentView,
} from './view';

export { DEFAULT_VIEW, createImageView, createPdfView } from './view';

// Node types
export type {
  LynkNodeType,
  BaseNodeData,
  CachedExtractorEdges,
  DisplayNodeData,
  ExtractorNodeData,
  CachedOperationInputs,
  CalculationResult,
  CalculationNodeData,
  SheetEntry,
  SheetSubheader,
  SheetComputedResult,
  SheetNodeData,
  LabelFormat,
  LabelNodeData,
  GroupNodeData,
  LynkNodeData,
  DisplayNode,
  ExtractorNode,
  CalculationNode,
  SheetNode,
  LabelNode,
  GroupNode,
  LynkNode,
} from './nodes';

// Canvas state
export type { CanvasMetadata, CanvasState } from './canvas';

// Node capabilities and categories
export { FileNode, SourceNode, CanExport, CanImport } from './categories';
export type { NodeOutput, Exportable, Importable, FileNodeData, SourceNodeData } from './categories';
