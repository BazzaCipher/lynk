import { describe, it, expect } from 'vitest';
import { normalizeDataType, isSimpleDataType } from '../../types/data';

describe('normalizeDataType', () => {
  it('converts "text" to "string"', () => {
    expect(normalizeDataType('text')).toBe('string');
  });

  it('passes through standard types unchanged', () => {
    expect(normalizeDataType('string')).toBe('string');
    expect(normalizeDataType('number')).toBe('number');
    expect(normalizeDataType('boolean')).toBe('boolean');
    expect(normalizeDataType('date')).toBe('date');
    expect(normalizeDataType('currency')).toBe('currency');
    expect(normalizeDataType('array')).toBe('array');
    expect(normalizeDataType('table')).toBe('table');
  });
});

describe('isSimpleDataType', () => {
  it('returns true for simple types', () => {
    expect(isSimpleDataType('string')).toBe(true);
    expect(isSimpleDataType('number')).toBe(true);
    expect(isSimpleDataType('boolean')).toBe(true);
    expect(isSimpleDataType('date')).toBe(true);
    expect(isSimpleDataType('currency')).toBe(true);
  });

  it('returns true for legacy "text"', () => {
    expect(isSimpleDataType('text')).toBe(true);
  });

  it('returns false for complex types', () => {
    expect(isSimpleDataType('array')).toBe(false);
    expect(isSimpleDataType('table')).toBe(false);
  });
});
