import { z } from 'zod';

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

// Data value
const DataValueSchema: z.ZodType<{
  type: 'number' | 'text' | 'date' | 'array' | 'table';
  value: unknown;
  source?: z.infer<typeof DataSourceReferenceSchema>;
}> = z.object({
  type: z.enum(['number', 'text', 'date', 'array', 'table']),
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
  dataType: z.enum(['string', 'number', 'boolean', 'date', 'currency']),
  color: z.string(),
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

// Calculation node data
const CalculationNodeDataSchema = z.object({
  label: z.string(),
  operation: z.enum(['sum', 'average', 'min', 'max', 'count']),
  precision: z.number(),
  inputs: z.array(DataValueSchema),
  result: DataValueSchema.optional(),
});

// Sheet column
const SheetColumnSchema = z.object({
  id: z.string(),
  header: z.string(),
  subheader: z.string().optional(),
  aggregation: z.enum(['sum', 'average', 'min', 'max', 'count', 'none']),
});

// Sheet node data
const SheetNodeDataSchema = z.object({
  label: z.string(),
  columns: z.array(SheetColumnSchema),
  rows: z.array(z.array(DataValueSchema)),
});

// Label node data
const LabelNodeDataSchema = z.object({
  label: z.string(),
  format: z.enum(['number', 'currency', 'date', 'text']),
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
