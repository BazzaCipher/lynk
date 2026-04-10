import { describe, it, expect } from 'vitest';
import {
  getFileTypeColor,
  getColorForType,
  getTypeColorClass,
  getTypeBadgeClass,
  createGradientFromTypes,
  getCompatibleTypes,
  getOutputHandleColor,
  getInputHandleColor,
  DATA_TYPE_COLORS,
} from '../../utils/colors';
import type { SimpleDataType } from '../../types';

describe('getFileTypeColor', () => {
  it('returns known file type colors', () => {
    const pdf = getFileTypeColor('application/pdf');
    expect(pdf.label).toBe('PDF');
    expect(pdf.border).toBeTruthy();
  });

  it('returns fallback for unknown types', () => {
    const unknown = getFileTypeColor('application/zip');
    expect(unknown.label).toBe('ZIP');
  });

  it('returns "FILE" label when no subtype', () => {
    const unknown = getFileTypeColor('unknown');
    expect(unknown.label).toBe('FILE');
  });
});

describe('getColorForType', () => {
  it('returns color for known types', () => {
    expect(getColorForType('number').border).toBe('#48b448');
  });

  it('falls back to string for unknown types', () => {
    expect(getColorForType('unknown' as SimpleDataType)).toEqual(DATA_TYPE_COLORS.string);
  });
});

describe('getTypeColorClass', () => {
  it('returns tailwind classes for each type', () => {
    expect(getTypeColorClass('string')).toContain('bg-blue');
    expect(getTypeColorClass('number')).toContain('bg-green');
    expect(getTypeColorClass('currency')).toContain('bg-yellow');
    expect(getTypeColorClass('date')).toContain('bg-purple');
    expect(getTypeColorClass('boolean')).toContain('bg-pink');
  });

  it('falls back to string class for unknown', () => {
    expect(getTypeColorClass('unknown' as SimpleDataType)).toContain('bg-blue');
  });
});

describe('getTypeBadgeClass', () => {
  it('returns badge class for each type', () => {
    expect(getTypeBadgeClass('number')).toBe('bg-green-500');
  });
});

describe('createGradientFromTypes', () => {
  it('returns fallback color for empty array', () => {
    expect(createGradientFromTypes([])).toBe('#9c8468');
  });

  it('returns solid color for single type', () => {
    expect(createGradientFromTypes(['number'])).toBe(DATA_TYPE_COLORS.number.border);
  });

  it('returns gradient for multiple types', () => {
    const result = createGradientFromTypes(['number', 'currency']);
    expect(result).toContain('linear-gradient');
    expect(result).toContain('90deg');
  });
});

describe('getCompatibleTypes', () => {
  it('returns number+currency for number or currency', () => {
    expect(getCompatibleTypes('number')).toEqual(['number', 'currency']);
    expect(getCompatibleTypes('currency')).toEqual(['number', 'currency']);
  });

  it('returns undefined for other types', () => {
    expect(getCompatibleTypes('string')).toBeUndefined();
    expect(getCompatibleTypes('date')).toBeUndefined();
    expect(getCompatibleTypes('boolean')).toBeUndefined();
  });
});

describe('getOutputHandleColor', () => {
  it('returns fallback for undefined', () => {
    expect(getOutputHandleColor(undefined)).toBe('#9c8468');
  });

  it('uses compatibleTypes when present', () => {
    const result = getOutputHandleColor({ dataType: 'number', compatibleTypes: ['number', 'currency'] });
    expect(result).toContain('linear-gradient');
  });

  it('uses single dataType when no compatibleTypes', () => {
    const result = getOutputHandleColor({ dataType: 'string' });
    expect(result).toBe(DATA_TYPE_COLORS.string.border);
  });
});

describe('getInputHandleColor', () => {
  it('returns fallback for undefined', () => {
    expect(getInputHandleColor(undefined)).toBe('#9c8468');
  });

  it('handles array of types', () => {
    const result = getInputHandleColor(['number', 'currency']);
    expect(result).toContain('linear-gradient');
  });

  it('handles record of types with handleId', () => {
    const types = { 'handle-1': ['number' as SimpleDataType] };
    const result = getInputHandleColor(types, 'handle-1');
    expect(result).toBe(DATA_TYPE_COLORS.number.border);
  });

  it('returns fallback for record without matching handleId', () => {
    const types = { 'handle-1': ['number' as SimpleDataType] };
    const result = getInputHandleColor(types, 'handle-2');
    expect(result).toBe('#9c8468');
  });
});
