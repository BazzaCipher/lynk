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

// Node types
export type {
  LynkNodeType,
  BaseNodeData,
  FileNodeData,
  CachedOperationInputs,
  CalculationResult,
  CalculationNodeData,
  SheetEntry,
  SheetSubheader,
  SheetComputedResult,
  SheetNodeData,
  LabelFormat,
  LabelNodeData,
  LynkNodeData,
  FileNode,
  CalculationNode,
  SheetNode,
  LabelNode,
  LynkNode,
} from './nodes';

// Canvas state
export type { CanvasMetadata, CanvasState } from './canvas';
