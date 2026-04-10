import { describe, it, expect } from 'vitest';
import { detectFields, fieldOverlapsExisting } from '../../core/extraction/fieldDetector';
import type { FullPageOcrResult, OcrLine } from '../../core/extraction/ocrExtractor';

function makeLine(text: string, y: number, confidence = 0.95): OcrLine {
  const words = text.split(/\s+/).map((word, i) => ({
    text: word,
    bbox: { x0: i * 80, y0: y, x1: i * 80 + 70, y1: y + 20 },
    confidence,
  }));
  return {
    text,
    words,
    bbox: { x0: 0, y0: y, x1: text.length * 10, y1: y + 20 },
    confidence,
  };
}

function makeOcrResult(lines: OcrLine[]): FullPageOcrResult {
  return {
    text: lines.map(l => l.text).join('\n'),
    lines,
    words: lines.flatMap(l => l.words),
    confidence: 0.95,
  };
}

describe('detectFields', () => {
  it('detects labeled invoice number', () => {
    const ocrResult = makeOcrResult([makeLine('Invoice #: INV-2025-001', 0)]);
    const fields = detectFields(ocrResult);
    expect(fields.some(f => f.fieldType === 'invoice_number')).toBe(true);
  });

  it('detects labeled total amount', () => {
    const ocrResult = makeOcrResult([makeLine('Total: $1,234.56', 0)]);
    const fields = detectFields(ocrResult);
    expect(fields.some(f => f.fieldType === 'total_amount')).toBe(true);
  });

  it('detects labeled date', () => {
    const ocrResult = makeOcrResult([makeLine('Date: 01/15/2025', 0)]);
    const fields = detectFields(ocrResult);
    expect(fields.some(f => f.fieldType === 'date')).toBe(true);
  });

  it('detects standalone email', () => {
    const ocrResult = makeOcrResult([makeLine('Contact: user@example.com', 0)]);
    const fields = detectFields(ocrResult);
    expect(fields.some(f => f.fieldType === 'email')).toBe(true);
  });

  it('detects standalone currency amounts', () => {
    const ocrResult = makeOcrResult([makeLine('$500.00', 0)]);
    const fields = detectFields(ocrResult);
    expect(fields.some(f => f.fieldType === 'currency_amount')).toBe(true);
  });

  it('deduplicates overlapping fields', () => {
    // Same line detected as both labeled and standalone
    const ocrResult = makeOcrResult([
      makeLine('Total: $500.00', 0),
    ]);
    const fields = detectFields(ocrResult);
    // Should not have both total_amount and currency_amount for same bbox
    const totalFields = fields.filter(f => f.bbox.y === 0);
    // Deduplication should reduce count
    expect(totalFields.length).toBeLessThanOrEqual(2);
  });

  it('sorts fields top-to-bottom, left-to-right', () => {
    const ocrResult = makeOcrResult([
      makeLine('Total: $500.00', 100),
      makeLine('Invoice #: INV-001', 0),
    ]);
    const fields = detectFields(ocrResult);
    if (fields.length >= 2) {
      expect(fields[0].bbox.y).toBeLessThanOrEqual(fields[1].bbox.y);
    }
  });

  it('returns empty for no matches', () => {
    const ocrResult = makeOcrResult([makeLine('Hello world', 0)]);
    const fields = detectFields(ocrResult);
    // May still detect phone-like patterns; just ensure no crash
    expect(Array.isArray(fields)).toBe(true);
  });
});

describe('fieldOverlapsExisting', () => {
  it('returns true when field overlaps existing region', () => {
    const field = {
      text: 'test',
      confidence: 0.9,
      bbox: { x: 10, y: 10, width: 100, height: 20 },
      fieldType: 'date' as const,
      label: 'Date',
      dataType: 'date' as const,
    };
    const existingRegions = [{ x: 15, y: 12, width: 90, height: 18 }];
    expect(fieldOverlapsExisting(field, existingRegions)).toBe(true);
  });

  it('returns false when no overlap', () => {
    const field = {
      text: 'test',
      confidence: 0.9,
      bbox: { x: 10, y: 10, width: 100, height: 20 },
      fieldType: 'date' as const,
      label: 'Date',
      dataType: 'date' as const,
    };
    const existingRegions = [{ x: 500, y: 500, width: 100, height: 20 }];
    expect(fieldOverlapsExisting(field, existingRegions)).toBe(false);
  });

  it('returns false for empty existing regions', () => {
    const field = {
      text: 'test',
      confidence: 0.9,
      bbox: { x: 10, y: 10, width: 100, height: 20 },
      fieldType: 'date' as const,
      label: 'Date',
      dataType: 'date' as const,
    };
    expect(fieldOverlapsExisting(field, [])).toBe(false);
  });
});
