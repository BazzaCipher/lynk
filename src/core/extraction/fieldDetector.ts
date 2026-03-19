/**
 * Field Detector
 *
 * Pattern-based detection for common document fields like invoice numbers,
 * dates, totals, and contact information.
 */

import type { FullPageOcrResult, OcrLine } from './ocrExtractor';
import type { DetectedField, FieldType } from '../../types/regions';
import type { SimpleDataType, RegionCoordinates } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

interface FieldPattern {
  fieldType: FieldType;
  labelPatterns: RegExp[];
  valuePattern?: RegExp;
  dataType: SimpleDataType;
  labelPrefix: string;
}

const FIELD_PATTERNS: FieldPattern[] = [
  // Invoice/Order/Reference numbers
  {
    fieldType: 'invoice_number',
    labelPatterns: [
      /invoice\s*[#:no.]+/i,
      /inv\s*[#:no.]+/i,
      /order\s*[#:no.]+/i,
      /reference\s*[#:no.]+/i,
      /ref\s*[#:no.]+/i,
      /po\s*[#:no.]+/i,
      /number[:\s]+/i,
    ],
    valuePattern: /[A-Z0-9][\w-]{2,}/i,
    dataType: 'string',
    labelPrefix: 'Invoice #',
  },
  // Total amounts
  {
    fieldType: 'total_amount',
    labelPatterns: [
      /total\s*(due|amount|:)?/i,
      /amount\s*due/i,
      /balance\s*due/i,
      /grand\s*total/i,
    ],
    valuePattern: /[$\u20AC\u00A3]?\s*[\d,]+\.?\d{0,2}/,
    dataType: 'currency',
    labelPrefix: 'Total',
  },
  // Subtotal
  {
    fieldType: 'subtotal',
    labelPatterns: [/sub[-\s]?total/i, /subtotal/i],
    valuePattern: /[$\u20AC\u00A3]?\s*[\d,]+\.?\d{0,2}/,
    dataType: 'currency',
    labelPrefix: 'Subtotal',
  },
  // Tax
  {
    fieldType: 'tax',
    labelPatterns: [/tax\s*:?/i, /vat\s*:?/i, /gst\s*:?/i, /sales\s*tax/i],
    valuePattern: /[$\u20AC\u00A3]?\s*[\d,]+\.?\d{0,2}/,
    dataType: 'currency',
    labelPrefix: 'Tax',
  },
  // Dates
  {
    fieldType: 'date',
    labelPatterns: [
      /date\s*:?/i,
      /invoice\s*date/i,
      /due\s*date/i,
      /order\s*date/i,
      /ship\s*date/i,
    ],
    dataType: 'date',
    labelPrefix: 'Date',
  },
];

// Standalone patterns (no label required)
const DATE_PATTERNS = [
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // MM/DD/YYYY or M/D/YY
  /\b\d{4}-\d{2}-\d{2}\b/, // YYYY-MM-DD
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i, // Month DD, YYYY
];

const CURRENCY_PATTERN = /[$\u20AC\u00A3]\s*[\d,]+\.\d{2}\b/;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
const PHONE_PATTERN =
  /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/;

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function bboxToRegionCoords(bbox: BoundingBox): RegionCoordinates {
  return {
    x: bbox.x0,
    y: bbox.y0,
    width: bbox.x1 - bbox.x0,
    height: bbox.y1 - bbox.y0,
  };
}

function mergeBboxes(boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    return { x0: 0, y0: 0, x1: 0, y1: 0 };
  }
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    y1: Math.max(...boxes.map((b) => b.y1)),
  };
}

function boxesOverlap(a: BoundingBox, b: BoundingBox, threshold = 0.8): boolean {
  const intersectX0 = Math.max(a.x0, b.x0);
  const intersectY0 = Math.max(a.y0, b.y0);
  const intersectX1 = Math.min(a.x1, b.x1);
  const intersectY1 = Math.min(a.y1, b.y1);

  if (intersectX1 <= intersectX0 || intersectY1 <= intersectY0) {
    return false;
  }

  const intersectArea = (intersectX1 - intersectX0) * (intersectY1 - intersectY0);
  const areaA = (a.x1 - a.x0) * (a.y1 - a.y0);
  const areaB = (b.x1 - b.x0) * (b.y1 - b.y0);
  const minArea = Math.min(areaA, areaB);

  return intersectArea / minArea >= threshold;
}

function findAdjacentValue(
  line: OcrLine,
  labelEndIndex: number,
  valuePattern?: RegExp
): { text: string; bbox: BoundingBox } | null {
  // Look for value in the same line after the label
  const remainingText = line.text.slice(labelEndIndex).trim();

  if (valuePattern) {
    const match = remainingText.match(valuePattern);
    if (match) {
      // Find the word(s) that contain this value
      const valueWords = line.words.filter((word) => {
        const wordStart = line.text.indexOf(word.text, labelEndIndex);
        return wordStart >= labelEndIndex && valuePattern.test(word.text);
      });
      if (valueWords.length > 0) {
        return {
          text: match[0],
          bbox: mergeBboxes(valueWords.map((w) => w.bbox)),
        };
      }
    }
  }

  // Default: take remaining words on the line as value
  const valueWords = line.words.filter((word) => {
    const wordStart = line.text.indexOf(word.text);
    return wordStart >= labelEndIndex && word.text.trim().length > 0;
  });

  if (valueWords.length > 0) {
    return {
      text: valueWords.map((w) => w.text).join(' '),
      bbox: mergeBboxes(valueWords.map((w) => w.bbox)),
    };
  }

  return null;
}

function detectLabeledFields(ocrResult: FullPageOcrResult): DetectedField[] {
  const fields: DetectedField[] = [];

  for (const line of ocrResult.lines) {
    for (const pattern of FIELD_PATTERNS) {
      for (const labelPattern of pattern.labelPatterns) {
        const match = line.text.match(labelPattern);
        if (match) {
          const labelEndIndex = (match.index ?? 0) + match[0].length;
          const adjacentValue = findAdjacentValue(
            line,
            labelEndIndex,
            pattern.valuePattern
          );

          if (adjacentValue && adjacentValue.text.trim()) {
            // Find label words
            const labelWords = line.words.filter((word) => {
              const wordStart = line.text.indexOf(word.text);
              return (
                wordStart >= (match.index ?? 0) && wordStart < labelEndIndex
              );
            });

            const labelBbox =
              labelWords.length > 0
                ? mergeBboxes(labelWords.map((w) => w.bbox))
                : line.bbox;
            const combinedBbox = mergeBboxes([labelBbox, adjacentValue.bbox]);

            fields.push({
              text: adjacentValue.text.trim(),
              confidence: line.confidence,
              bbox: bboxToRegionCoords(combinedBbox),
              fieldType: pattern.fieldType,
              label: pattern.labelPrefix,
              dataType: pattern.dataType,
            });
          }
          break; // Only match one pattern per line
        }
      }
    }
  }

  return fields;
}

function detectStandaloneFields(ocrResult: FullPageOcrResult): DetectedField[] {
  const fields: DetectedField[] = [];

  for (const line of ocrResult.lines) {
    // Detect standalone dates
    for (const datePattern of DATE_PATTERNS) {
      const match = line.text.match(datePattern);
      if (match) {
        const matchedWords = line.words.filter((word) =>
          datePattern.test(word.text) || match[0].includes(word.text)
        );
        if (matchedWords.length > 0) {
          fields.push({
            text: match[0],
            confidence: line.confidence,
            bbox: bboxToRegionCoords(mergeBboxes(matchedWords.map((w) => w.bbox))),
            fieldType: 'date',
            label: 'Date',
            dataType: 'date',
          });
        }
      }
    }

    // Detect standalone currency amounts
    const currencyMatches = line.text.matchAll(new RegExp(CURRENCY_PATTERN, 'g'));
    for (const match of currencyMatches) {
      const matchedWords = line.words.filter((word) =>
        CURRENCY_PATTERN.test(word.text) || match[0].includes(word.text)
      );
      if (matchedWords.length > 0) {
        fields.push({
          text: match[0],
          confidence: line.confidence,
          bbox: bboxToRegionCoords(mergeBboxes(matchedWords.map((w) => w.bbox))),
          fieldType: 'currency_amount',
          label: 'Amount',
          dataType: 'currency',
        });
      }
    }

    // Detect emails
    const emailMatch = line.text.match(EMAIL_PATTERN);
    if (emailMatch) {
      const matchedWords = line.words.filter(
        (word) => EMAIL_PATTERN.test(word.text) || emailMatch[0].includes(word.text)
      );
      if (matchedWords.length > 0) {
        fields.push({
          text: emailMatch[0],
          confidence: line.confidence,
          bbox: bboxToRegionCoords(mergeBboxes(matchedWords.map((w) => w.bbox))),
          fieldType: 'email',
          label: 'Email',
          dataType: 'string',
        });
      }
    }

    // Detect phone numbers
    const phoneMatch = line.text.match(PHONE_PATTERN);
    if (phoneMatch) {
      const matchedWords = line.words.filter(
        (word) => PHONE_PATTERN.test(word.text) || phoneMatch[0].includes(word.text)
      );
      if (matchedWords.length > 0) {
        fields.push({
          text: phoneMatch[0],
          confidence: line.confidence,
          bbox: bboxToRegionCoords(mergeBboxes(matchedWords.map((w) => w.bbox))),
          fieldType: 'phone',
          label: 'Phone',
          dataType: 'string',
        });
      }
    }
  }

  return fields;
}

function deduplicateFields(fields: DetectedField[]): DetectedField[] {
  const result: DetectedField[] = [];

  for (const field of fields) {
    const fieldBbox: BoundingBox = {
      x0: field.bbox.x,
      y0: field.bbox.y,
      x1: field.bbox.x + field.bbox.width,
      y1: field.bbox.y + field.bbox.height,
    };

    // Check if this field overlaps significantly with any existing field
    const overlaps = result.some((existing) => {
      const existingBbox: BoundingBox = {
        x0: existing.bbox.x,
        y0: existing.bbox.y,
        x1: existing.bbox.x + existing.bbox.width,
        y1: existing.bbox.y + existing.bbox.height,
      };
      return boxesOverlap(fieldBbox, existingBbox, 0.5);
    });

    if (!overlaps) {
      result.push(field);
    }
  }

  return result;
}

/**
 * Detect fields from OCR results using pattern matching.
 *
 * @param ocrResult - Full page OCR results with words and lines
 * @returns Array of detected fields with their locations and types
 */
export function detectFields(ocrResult: FullPageOcrResult): DetectedField[] {
  // First detect labeled fields (e.g., "Invoice #: 12345")
  const labeledFields = detectLabeledFields(ocrResult);

  // Then detect standalone fields (dates, currency, email, phone)
  const standaloneFields = detectStandaloneFields(ocrResult);

  // Combine and deduplicate
  const allFields = [...labeledFields, ...standaloneFields];
  const deduplicated = deduplicateFields(allFields);

  // Sort by position (top to bottom, left to right)
  deduplicated.sort((a, b) => {
    const yDiff = a.bbox.y - b.bbox.y;
    if (Math.abs(yDiff) > 10) return yDiff;
    return a.bbox.x - b.bbox.x;
  });

  return deduplicated;
}

/**
 * Check if a detected field overlaps with existing regions.
 *
 * @param field - The detected field to check
 * @param existingRegions - Array of existing region coordinates
 * @param threshold - Overlap threshold (0-1)
 * @returns true if the field overlaps with any existing region
 */
export function fieldOverlapsExisting(
  field: DetectedField,
  existingRegions: RegionCoordinates[],
  threshold = 0.8
): boolean {
  const fieldBbox: BoundingBox = {
    x0: field.bbox.x,
    y0: field.bbox.y,
    x1: field.bbox.x + field.bbox.width,
    y1: field.bbox.y + field.bbox.height,
  };

  return existingRegions.some((region) => {
    const regionBbox: BoundingBox = {
      x0: region.x,
      y0: region.y,
      x1: region.x + region.width,
      y1: region.y + region.height,
    };
    return boxesOverlap(fieldBbox, regionBbox, threshold);
  });
}
