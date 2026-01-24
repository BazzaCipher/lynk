import { z } from 'zod';
import { OPERATION_IDS } from '../core/operations/operationRegistry';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA TYPE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/** Simple data types for region values and calculations */
const SimpleDataTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'currency']);

/** Extended data types including complex types and legacy 'text' alias */
const ExtendedDataTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'currency', 'array', 'table', 'text']);

// ═══════════════════════════════════════════════════════════════════════════════
// GEOMETRY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

// Region coordinates for box selections
const RegionCoordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

// Text range for text selections
const TextRangeSchema = z.object({
  startOffset: z.number(),
  endOffset: z.number(),
  text: z.string(),
  rects: z.array(RegionCoordinatesSchema),
});

// Data source reference
const DataSourceReferenceSchema = z.object({
  nodeId: z.string(),
  regionId: z.string(),
  pageNumber: z.number().optional(),
  coordinates: RegionCoordinatesSchema.optional(),
  textRange: TextRangeSchema.optional(),
  extractionMethod: z.enum(['manual', 'ocr', 'ai']),
  confidence: z.number().optional(),
});

// Data value - supports all extended types including legacy 'text'
const DataValueSchema: z.ZodType<{
  type: z.infer<typeof ExtendedDataTypeSchema>;
  value: unknown;
  source?: z.infer<typeof DataSourceReferenceSchema>;
}> = z.object({
  type: ExtendedDataTypeSchema,
  value: z.unknown(),
  source: DataSourceReferenceSchema.optional(),
});

// Extracted region
const ExtractedRegionSchema = z.object({
  id: z.string(),
  label: z.string(),
  selectionType: z.enum(['box', 'text']),
  coordinates: RegionCoordinatesSchema.optional(),
  textRange: TextRangeSchema.optional(),
  pageNumber: z.number(),
  extractedData: DataValueSchema,
  dataType: SimpleDataTypeSchema,
  color: z.string(),
  valueCache: z.record(SimpleDataTypeSchema, z.string()).optional(),
});

// File node data
const FileNodeDataSchema = z.object({
  label: z.string(),
  fileType: z.enum(['pdf', 'image']),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
  regions: z.array(ExtractedRegionSchema),
  currentPage: z.number(),
  totalPages: z.number(),
});

// Calculation result - uses SimpleDataType (no complex types)
const CalculationResultSchema = z.object({
  value: z.union([z.number(), z.string()]),
  dataType: SimpleDataTypeSchema,
  source: DataSourceReferenceSchema.optional(),
});

// Cached operation inputs for operation switching
const CachedOperationInputsSchema = z.object({
  operationId: z.string(),
  edgeIds: z.array(z.string()),
  cachedAt: z.string(),
});

// Calculation node data
const CalculationNodeDataSchema = z.object({
  label: z.string(),
  operation: z.enum(OPERATION_IDS),
  precision: z.number(),
  inputs: z.array(DataValueSchema),
  result: CalculationResultSchema.optional(),
  inputCache: z.record(z.string(), CachedOperationInputsSchema).optional(),
});

// Sheet entry - mini aggregator within a subheader
const SheetEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  operation: z.enum(OPERATION_IDS),
  expanded: z.boolean().optional(),
});

// Sheet subheader - groups entries and aggregates their outputs
const SheetSubheaderSchema = z.object({
  id: z.string(),
  label: z.string(),
  operation: z.enum(OPERATION_IDS),
  entries: z.array(SheetEntrySchema),
  collapsed: z.boolean().optional(),
});

// Sheet node data - hierarchical data aggregator
const SheetNodeDataSchema = z.object({
  label: z.string(),
  subheaders: z.array(SheetSubheaderSchema),
  // entryResults and subheaderResults are computed at runtime, not persisted
});

// Label node data
const LabelNodeDataSchema = z.object({
  label: z.string(),
  format: z.enum(['number', 'currency', 'date', 'string', 'text']).transform(
    (v) => v === 'text' ? 'string' : v
  ),
  value: DataValueSchema.optional(),
  fontSize: z.enum(['small', 'medium', 'large']),
  alignment: z.enum(['left', 'center', 'right']),
});

// Position
const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// Node schema (discriminated union)
const NodeSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('file'),
    position: PositionSchema,
    data: FileNodeDataSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal('calculation'),
    position: PositionSchema,
    data: CalculationNodeDataSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal('sheet'),
    position: PositionSchema,
    data: SheetNodeDataSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal('label'),
    position: PositionSchema,
    data: LabelNodeDataSchema,
  }),
]);

// Edge schema
const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

// Viewport schema
const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

// Canvas metadata
const MetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Full canvas state schema
export const CanvasStateSchema = z.object({
  version: z.string(),
  metadata: MetadataSchema,
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  viewport: ViewportSchema,
});

export type ValidatedCanvasState = z.infer<typeof CanvasStateSchema>;
