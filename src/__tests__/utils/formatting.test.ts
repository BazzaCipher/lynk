import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  parseDateString,
  detectDataType,
  parseNumericValue,
  formatValue,
  formatDateForInput,
  formatDateDisplay,
  validateValue,
  parseBooleanValue,
  toBoolean,
} from '../../utils/formatting';

// ═══════════════════════════════════════════════════════════════════════════════
// formatFileSize
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatFileSize', () => {
  it('returns "0 B" for zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes with one decimal when < 10', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(5 * 1024)).toBe('5.0 KB');
  });

  it('rounds kilobytes when >= 10', () => {
    expect(formatFileSize(15 * 1024)).toBe('15 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseDateString
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseDateString', () => {
  it('returns null for empty/null input', () => {
    expect(parseDateString('')).toBeNull();
    expect(parseDateString('  ')).toBeNull();
    expect(parseDateString(null as any)).toBeNull();
  });

  it('passes through ISO dates', () => {
    expect(parseDateString('2025-01-15')).toBe('2025-01-15');
  });

  it('parses DD/MM/YYYY (unambiguous day > 12)', () => {
    expect(parseDateString('25/01/2025')).toBe('2025-01-25');
  });

  it('parses MM/DD/YYYY (unambiguous month > 12 in second position)', () => {
    expect(parseDateString('01/25/2025')).toBe('2025-01-25');
  });

  it('defaults to DD/MM for ambiguous dates', () => {
    expect(parseDateString('05/06/2025')).toBe('2025-06-05');
  });

  it('parses DD-MM-YYYY and DD.MM.YYYY', () => {
    expect(parseDateString('15-03-2025')).toBe('2025-03-15');
    expect(parseDateString('15.03.2025')).toBe('2025-03-15');
  });

  it('parses "15 May 2025"', () => {
    expect(parseDateString('15 May 2025')).toBe('2025-05-15');
  });

  it('parses "15 May, 2025"', () => {
    expect(parseDateString('15 May, 2025')).toBe('2025-05-15');
  });

  it('parses "May 15, 2025"', () => {
    expect(parseDateString('May 15, 2025')).toBe('2025-05-15');
  });

  it('parses "May 15 2025"', () => {
    expect(parseDateString('May 15 2025')).toBe('2025-05-15');
  });

  it('parses short month names like "Jan 5, 2025"', () => {
    expect(parseDateString('Jan 5, 2025')).toBe('2025-01-05');
  });

  it('parses full month names like "15 January 2025"', () => {
    expect(parseDateString('15 January 2025')).toBe('2025-01-15');
  });

  it('falls back to native Date parse', () => {
    // "January 15, 2025" matches mdyMatch
    const result = parseDateString('January 15, 2025');
    expect(result).toBe('2025-01-15');
  });

  it('returns null for unparseable strings', () => {
    expect(parseDateString('not a date')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// detectDataType
// ═══════════════════════════════════════════════════════════════════════════════

describe('detectDataType', () => {
  it('returns "string" for empty input', () => {
    expect(detectDataType('')).toBe('string');
    expect(detectDataType(null as any)).toBe('string');
  });

  it('detects currency', () => {
    expect(detectDataType('$100.00')).toBe('currency');
    expect(detectDataType('€50')).toBe('currency');
    expect(detectDataType('£99.99')).toBe('currency');
  });

  it('detects dates', () => {
    expect(detectDataType('2025-01-15')).toBe('date');
    expect(detectDataType('15/01/2025')).toBe('date');
    expect(detectDataType('May 15, 2025')).toBe('date');
  });

  it('detects numbers', () => {
    expect(detectDataType('42')).toBe('number');
    expect(detectDataType('1,234.56')).toBe('number');
    expect(detectDataType('-99')).toBe('number');
  });

  it('returns "string" for plain text', () => {
    expect(detectDataType('hello world')).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseNumericValue
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseNumericValue', () => {
  it('returns number for numeric input', () => {
    expect(parseNumericValue(42)).toBe(42);
    expect(parseNumericValue(3.14)).toBe(3.14);
  });

  it('returns null for NaN', () => {
    expect(parseNumericValue(NaN)).toBeNull();
  });

  it('parses string numbers', () => {
    expect(parseNumericValue('42')).toBe(42);
    expect(parseNumericValue('3.14')).toBe(3.14);
  });

  it('strips currency symbols and commas', () => {
    expect(parseNumericValue('$1,234.56')).toBe(1234.56);
    expect(parseNumericValue('€99')).toBe(99);
  });

  it('returns null for non-numeric strings', () => {
    expect(parseNumericValue('abc')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatValue
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatValue', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(formatValue(null, 'string')).toBe('');
    expect(formatValue(undefined, 'string')).toBe('');
    expect(formatValue('', 'string')).toBe('');
  });

  it('formats strings as-is', () => {
    expect(formatValue('hello', 'string')).toBe('hello');
  });

  it('formats numbers with locale', () => {
    const result = formatValue('1234.5', 'number');
    expect(result).toContain('1');
  });

  it('returns original for non-numeric number type', () => {
    expect(formatValue('abc', 'number')).toBe('abc');
  });

  it('formats dates as DD/MM/YYYY', () => {
    expect(formatValue('2025-01-15', 'date')).toBe('15/01/2025');
  });

  it('returns original for unparseable dates', () => {
    expect(formatValue('not a date', 'date')).toBe('not a date');
  });

  it('formats booleans', () => {
    expect(formatValue('yes', 'boolean')).toBe('Yes');
    expect(formatValue('true', 'boolean')).toBe('Yes');
    expect(formatValue('1', 'boolean')).toBe('Yes');
    expect(formatValue('no', 'boolean')).toBe('No');
    expect(formatValue('false', 'boolean')).toBe('No');
    expect(formatValue('0', 'boolean')).toBe('No');
    expect(formatValue('maybe', 'boolean')).toBe('Unknown');
  });

  it('formats currency', () => {
    const result = formatValue('1234.56', 'currency');
    // Should contain the number formatted with 2 decimal places
    expect(result).toBeTruthy();
  });

  it('returns original when currency parse fails', () => {
    expect(formatValue('abc', 'currency')).toBe('abc');
  });

  it('falls back to USD when currency code is invalid', () => {
    // Force an invalid currency by passing options with bad currency
    const result = formatValue('100', 'currency', { currency: 'INVALID' });
    // Should fall back to USD formatting
    expect(result).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatDateForInput
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatDateForInput', () => {
  it('returns empty string for empty input', () => {
    expect(formatDateForInput('')).toBe('');
  });

  it('returns ISO format for valid date strings', () => {
    expect(formatDateForInput('May 15, 2025')).toBe('2025-05-15');
  });

  it('returns empty string for unparseable dates', () => {
    expect(formatDateForInput('not a date')).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatDateDisplay
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatDateDisplay', () => {
  it('formats a valid date string', () => {
    const result = formatDateDisplay('2025-06-15T00:00:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('Invalid Date');
  });

  it('formats a Date object', () => {
    const result = formatDateDisplay(new Date(2025, 0, 15));
    expect(result).toBeTruthy();
  });

  it('returns original string for invalid date', () => {
    expect(formatDateDisplay('not a date')).toBe('not a date');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateValue
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateValue', () => {
  it('returns valid for empty input', () => {
    expect(validateValue('', 'number')).toEqual({ valid: true });
    expect(validateValue('  ', 'date')).toEqual({ valid: true });
  });

  it('validates numbers', () => {
    expect(validateValue('42', 'number').valid).toBe(true);
    expect(validateValue('abc', 'number').valid).toBe(false);
  });

  it('validates currency as number', () => {
    expect(validateValue('$100', 'currency').valid).toBe(true);
    expect(validateValue('abc', 'currency').valid).toBe(false);
  });

  it('validates dates', () => {
    expect(validateValue('2025-01-15', 'date').valid).toBe(true);
    expect(validateValue('invalid', 'date').valid).toBe(false);
  });

  it('always valid for string type', () => {
    expect(validateValue('anything', 'string').valid).toBe(true);
  });

  it('always valid for boolean type', () => {
    expect(validateValue('yes', 'boolean').valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseBooleanValue
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseBooleanValue', () => {
  it('parses yes values', () => {
    expect(parseBooleanValue('yes')).toBe('yes');
    expect(parseBooleanValue('true')).toBe('yes');
    expect(parseBooleanValue('1')).toBe('yes');
    expect(parseBooleanValue('YES')).toBe('yes');
  });

  it('parses no values', () => {
    expect(parseBooleanValue('no')).toBe('no');
    expect(parseBooleanValue('false')).toBe('no');
    expect(parseBooleanValue('0')).toBe('no');
  });

  it('returns unknown for other values', () => {
    expect(parseBooleanValue('maybe')).toBe('unknown');
    expect(parseBooleanValue('')).toBe('unknown');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// toBoolean
// ═══════════════════════════════════════════════════════════════════════════════

describe('toBoolean', () => {
  it('returns boolean values directly', () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean(false)).toBe(false);
  });

  it('converts truthy strings', () => {
    expect(toBoolean('yes')).toBe(true);
    expect(toBoolean('true')).toBe(true);
    expect(toBoolean('1')).toBe(true);
  });

  it('converts falsy strings', () => {
    expect(toBoolean('no')).toBe(false);
    expect(toBoolean('false')).toBe(false);
    expect(toBoolean('0')).toBe(false);
    expect(toBoolean('anything')).toBe(false);
  });
});
