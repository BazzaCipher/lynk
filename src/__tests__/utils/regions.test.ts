import { describe, it, expect } from 'vitest';
import { normalizeExtractedValue, createRegionFromBox, createRegionFromText } from '../../utils/regions';

describe('normalizeExtractedValue', () => {
  it('parses dates to ISO strings', () => {
    expect(normalizeExtractedValue('May 15, 2025', 'date')).toBe('2025-05-15');
  });

  it('returns original text when date parse fails', () => {
    expect(normalizeExtractedValue('not a date', 'date')).toBe('not a date');
  });

  it('strips currency symbols', () => {
    expect(normalizeExtractedValue('$100.00', 'currency')).toBe('100.00');
    expect(normalizeExtractedValue('€50', 'currency')).toBe('50');
  });

  it('returns text as-is for other types', () => {
    expect(normalizeExtractedValue('hello', 'string')).toBe('hello');
    expect(normalizeExtractedValue('42', 'number')).toBe('42');
  });
});

describe('createRegionFromBox', () => {
  it('creates a region with box selection type', () => {
    const coords = { x: 10, y: 20, width: 100, height: 50 };
    const region = createRegionFromBox(coords, 1, 3);
    expect(region.selectionType).toBe('box');
    expect(region.label).toBe('Field 4');
    expect(region.pageNumber).toBe(1);
    expect(region.coordinates).toEqual(coords);
    expect(region.dataType).toBe('string');
    expect(region.id).toMatch(/^region-/);
  });
});

describe('createRegionFromText', () => {
  it('creates a region with detected data type', () => {
    const textRange = { startOffset: 0, endOffset: 5, text: '$100.00', rects: [] };
    const region = createRegionFromText(textRange, 1, 0);
    expect(region.selectionType).toBe('text');
    expect(region.label).toBe('Text 1');
    expect(region.dataType).toBe('currency');
  });

  it('detects number type', () => {
    const textRange = { startOffset: 0, endOffset: 2, text: '42', rects: [] };
    const region = createRegionFromText(textRange, 1, 0);
    expect(region.dataType).toBe('number');
  });

  it('detects string type', () => {
    const textRange = { startOffset: 0, endOffset: 5, text: 'hello', rects: [] };
    const region = createRegionFromText(textRange, 1, 0);
    expect(region.dataType).toBe('string');
  });
});
