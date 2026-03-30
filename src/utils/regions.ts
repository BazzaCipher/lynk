import type { ExtractedRegion, RegionCoordinates, TextRange, SimpleDataType } from '../types';
import { getColorForType } from './colors';
import { generateId } from './id';
import { detectDataType, parseDateString } from './formatting';

/**
 * Normalize an extracted text value based on its detected data type.
 * Dates are parsed to ISO strings, currency symbols are stripped.
 */
export function normalizeExtractedValue(text: string, dataType: SimpleDataType): string | Date {
  switch (dataType) {
    case 'date':
      return parseDateString(text) ?? text;
    case 'currency':
      return text.replace(/^[$€£¥₹₩₪₫₱]\s*/, '').trim();
    default:
      return text;
  }
}

/**
 * Create an ExtractedRegion from a box selection (coordinates).
 */
export function createRegionFromBox(
  coordinates: RegionCoordinates,
  pageNumber: number,
  existingCount: number
): ExtractedRegion {
  return {
    id: generateId('region'),
    label: `Field ${existingCount + 1}`,
    selectionType: 'box',
    coordinates,
    pageNumber,
    extractedData: { type: 'string', value: '' },
    dataType: 'string',
    color: getColorForType('string').border,
  };
}

/**
 * Create an ExtractedRegion from a text selection.
 * Automatically detects data type and normalizes the value.
 */
export function createRegionFromText(
  textRange: TextRange,
  pageNumber: number,
  existingCount: number
): ExtractedRegion {
  const detectedType = detectDataType(textRange.text);
  const value = normalizeExtractedValue(textRange.text, detectedType);

  return {
    id: generateId('region'),
    label: `Text ${existingCount + 1}`,
    selectionType: 'text',
    textRange,
    pageNumber,
    extractedData: { type: detectedType, value },
    dataType: detectedType,
    color: getColorForType(detectedType).border,
  };
}
