/**
 * Codec Types
 *
 * Defines the interface for canvas codecs that handle encoding/decoding
 * of specific features during canvas export/import.
 */

import type { CanvasState } from '../../types';

/**
 * Result of encoding canvas state for export.
 * Contains the modified canvas and any embedded data to be serialized.
 */
export interface EncodeResult<T> {
  canvas: CanvasState;
  embedded: T;
  warnings: string[];
}

/**
 * Result of decoding canvas state during import.
 * Contains the restored canvas with all references resolved.
 */
export interface DecodeResult {
  canvas: CanvasState;
  warnings: string[];
}

/**
 * Result of validating canvas state before export.
 */
export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * A codec handles encoding and decoding of a specific feature (e.g., files).
 *
 * Codecs colocate export and import logic for a feature, making it easier
 * to maintain and extend. Each codec defines its own embedded data shape.
 *
 * @template TEmbedded - The shape of data this codec embeds in the canvas
 */
export interface CanvasCodec<TEmbedded> {
  /** Unique identifier for this codec */
  readonly id: string;

  /** Human-readable name for this codec */
  readonly name: string;

  /**
   * Encode canvas state for export.
   * Converts runtime state (e.g., blob URLs) to serializable form (e.g., base64).
   */
  encode(canvas: CanvasState): Promise<EncodeResult<TEmbedded>>;

  /**
   * Decode canvas state during import.
   * Restores runtime state from serialized embedded data.
   */
  decode(canvas: CanvasState, embedded: TEmbedded | undefined): DecodeResult;

  /**
   * Validate canvas state before export.
   * Check for issues like missing files, orphaned references, etc.
   */
  validate?(canvas: CanvasState): ValidationResult;
}
