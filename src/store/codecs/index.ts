/**
 * Codec System
 *
 * Provides a codec-based architecture for canvas export/import.
 * Each codec handles encoding/decoding of a specific feature.
 */

export type {
  CanvasCodec,
  EncodeResult,
  DecodeResult,
  ValidationResult,
} from './types';

export { FileCodec, type FileEmbeddedData } from './fileCodec';

export {
  CanvasPipeline,
  defaultPipeline,
  type EmbeddedData,
  type ExportedCanvas,
  type PipelineExportResult,
  type PipelineImportResult,
} from './pipeline';
