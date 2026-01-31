/**
 * Canvas Pipeline
 *
 * Orchestrates codecs for canvas export/import.
 * Runs all registered codecs in sequence, aggregating embedded data and warnings.
 */

import type { CanvasState } from '../../types';
import type { CanvasCodec, ValidationResult } from './types';
import { FileCodec, type FileEmbeddedData } from './fileCodec';

/**
 * Embedded data structure for all codecs.
 * Each codec stores its data under its id key.
 */
export interface EmbeddedData {
  files?: FileEmbeddedData;
  [key: string]: unknown;
}

/**
 * Canvas with embedded data for export.
 */
export interface ExportedCanvas extends Omit<CanvasState, 'embedded'> {
  embedded?: EmbeddedData;
}

/**
 * Result of pipeline export operation.
 */
export interface PipelineExportResult {
  canvas: ExportedCanvas;
  warnings: string[];
}

/**
 * Result of pipeline import operation.
 */
export interface PipelineImportResult {
  canvas: CanvasState;
  warnings: string[];
}

/**
 * Pipeline orchestrates codecs for canvas export/import.
 *
 * Usage:
 * ```ts
 * const pipeline = new CanvasPipeline().register(FileCodec);
 * const { canvas, warnings } = await pipeline.export(canvasState);
 * const { canvas: imported, warnings } = pipeline.import(savedCanvas);
 * ```
 */
export class CanvasPipeline {
  private codecs: CanvasCodec<unknown>[] = [];

  /**
   * Register a codec with the pipeline.
   */
  register<T>(codec: CanvasCodec<T>): this {
    this.codecs.push(codec);
    return this;
  }

  /**
   * Export canvas state through all registered codecs.
   * Each codec encodes its data and stores it in the embedded object.
   */
  async export(canvas: CanvasState): Promise<PipelineExportResult> {
    const allWarnings: string[] = [];
    const embedded: EmbeddedData = {};
    let currentCanvas = canvas;

    for (const codec of this.codecs) {
      const result = await codec.encode(currentCanvas);
      currentCanvas = result.canvas;
      allWarnings.push(...result.warnings);

      // Store embedded data under codec's id
      if (result.embedded && Object.keys(result.embedded as object).length > 0) {
        embedded[codec.id] = result.embedded;
      }
    }

    // Create exported canvas with embedded data
    const exportedCanvas: ExportedCanvas = {
      ...currentCanvas,
      embedded: Object.keys(embedded).length > 0 ? embedded : undefined,
    };

    return {
      canvas: exportedCanvas,
      warnings: allWarnings,
    };
  }

  /**
   * Import canvas state through all registered codecs.
   * Each codec decodes its embedded data and restores runtime state.
   */
  import(canvas: ExportedCanvas): PipelineImportResult {
    const allWarnings: string[] = [];
    const embedded = canvas.embedded || {};
    let currentCanvas: CanvasState = canvas;

    for (const codec of this.codecs) {
      const codecEmbedded = embedded[codec.id];
      const result = codec.decode(currentCanvas, codecEmbedded);
      currentCanvas = result.canvas;
      allWarnings.push(...result.warnings);
    }

    return {
      canvas: currentCanvas,
      warnings: allWarnings,
    };
  }

  /**
   * Validate canvas state before export.
   * Runs all codec validators and aggregates results.
   */
  validate(canvas: CanvasState): ValidationResult {
    const allWarnings: string[] = [];
    const allErrors: string[] = [];

    for (const codec of this.codecs) {
      if (codec.validate) {
        const result = codec.validate(canvas);
        allWarnings.push(...result.warnings);
        allErrors.push(...result.errors);
      }
    }

    return {
      valid: allErrors.length === 0,
      warnings: allWarnings,
      errors: allErrors,
    };
  }
}

/**
 * Default pipeline with FileCodec registered.
 */
export const defaultPipeline = new CanvasPipeline().register(FileCodec);
