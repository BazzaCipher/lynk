/**
 * Extracted Region Types
 *
 * Defines the structure for regions extracted from documents,
 * including their selection type, data, and visual properties.
 */

import type { DataValue, SimpleDataType } from './data';
import type { RegionCoordinates, TextRange, SelectionType } from './geometry';

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTED REGIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Extracted region from a file node */
export interface ExtractedRegion {
  id: string;
  label: string;
  selectionType: SelectionType;
  /** For box selections */
  coordinates?: RegionCoordinates;
  /** For text selections */
  textRange?: TextRange;
  pageNumber: number;
  extractedData: DataValue;
  /** User-specified data type */
  dataType: SimpleDataType;
  color: string;
  /** Cached values per data type */
  valueCache?: Partial<Record<SimpleDataType, string>>;
}
