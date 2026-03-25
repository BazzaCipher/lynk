/**
 * Unified formatting utilities for value display, parsing, and validation.
 * Consolidates formatting logic from RegionList, useDataFlow, and CalculationNode.
 */

import type { SimpleDataType } from '../types';

export interface FormatOptions {
  precision?: number;
  locale?: string;
  currency?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE SIZE
// ═══════════════════════════════════════════════════════════════════════════════

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[i]}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCALE AND CURRENCY
// ═══════════════════════════════════════════════════════════════════════════════

const REGION_TO_CURRENCY: Record<string, string> = {
  'US': 'USD', 'AU': 'AUD', 'CA': 'CAD', 'GB': 'GBP', 'NZ': 'NZD',
  'EU': 'EUR', 'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
  'JP': 'JPY', 'CN': 'CNY', 'IN': 'INR', 'BR': 'BRL', 'MX': 'MXN',
  'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'PL': 'PLN',
  'RU': 'RUB', 'KR': 'KRW', 'SG': 'SGD', 'HK': 'HKD', 'ZA': 'ZAR',
};

/**
 * Get the currency code based on user's locale.
 */
export function getLocaleCurrency(): string {
  const locale = navigator.language || 'en-US';
  const region = locale.split('-')[1]?.toUpperCase() || 'US';
  return REGION_TO_CURRENCY[region] || 'USD';
}

/**
 * Get the currency symbol for display based on user's locale.
 */
export function getLocaleCurrencySymbol(): string {
  try {
    const currency = getLocaleCurrency();
    return new Intl.NumberFormat(undefined, { style: 'currency', currency })
      .formatToParts(0)
      .find(part => part.type === 'currency')?.value || '$';
  } catch {
    return '$';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE PARSING
// ═══════════════════════════════════════════════════════════════════════════════

const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

/**
 * Parse a date string in various common formats to an ISO date string (YYYY-MM-DD).
 * Avoids timezone offset bugs by extracting date parts directly without Date.toISOString().
 */
export function parseDateString(text: string): string | null {
  if (!text?.trim()) return null;
  const str = text.trim();

  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Separator formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const sepMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (sepMatch) {
    const aNum = parseInt(sepMatch[1], 10);
    const bNum = parseInt(sepMatch[2], 10);
    const yyyy = sepMatch[3];
    let day: number, month: number;

    if (aNum > 12) {
      // Unambiguous: DD/MM
      day = aNum; month = bNum;
    } else if (bNum > 12) {
      // Unambiguous: MM/DD
      month = aNum; day = bNum;
    } else {
      // Ambiguous - default to DD/MM (non-US convention)
      day = aNum; month = bNum;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // "15 May 2025" or "15 May, 2025"
  const dmyMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]+),?\s+(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthIdx = MONTH_NAMES.indexOf(dmyMatch[2].toLowerCase());
    const shortIdx = MONTH_SHORT.indexOf(dmyMatch[2].toLowerCase().slice(0, 3));
    const month = monthIdx >= 0 ? monthIdx + 1 : shortIdx >= 0 ? shortIdx + 1 : -1;
    if (month > 0) {
      return `${dmyMatch[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // "May 15, 2025" or "May 15 2025"
  const mdyMatch = str.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mdyMatch) {
    const day = parseInt(mdyMatch[2], 10);
    const monthIdx = MONTH_NAMES.indexOf(mdyMatch[1].toLowerCase());
    const shortIdx = MONTH_SHORT.indexOf(mdyMatch[1].toLowerCase().slice(0, 3));
    const month = monthIdx >= 0 ? monthIdx + 1 : shortIdx >= 0 ? shortIdx + 1 : -1;
    if (month > 0) {
      return `${mdyMatch[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Fallback: native Date parse, extract local parts to avoid UTC shift
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    // Use local date parts (not UTC) to avoid off-by-one due to timezone
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const CURRENCY_SYMBOL_RE = /^[$€£¥₹₩₪₫₱]/;
const DATE_PATTERN_RE = /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[a-zA-Z]+,?\s+\d{4}|[a-zA-Z]+\s+\d{1,2},?\s+\d{4})$/;
const NUMBER_PATTERN_RE = /^-?\d[\d,]*(\.\d+)?$/;

/**
 * Detect the most likely data type from a text string.
 * Used to auto-classify text selections.
 */
export function detectDataType(text: string): SimpleDataType {
  if (!text?.trim()) return 'string';
  const str = text.trim();
  if (CURRENCY_SYMBOL_RE.test(str)) return 'currency';
  if (DATE_PATTERN_RE.test(str) && parseDateString(str) !== null) return 'date';
  if (NUMBER_PATTERN_RE.test(str)) return 'number';
  return 'string';
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMERIC PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a string value to a number, handling currency symbols, commas, and various formats.
 */
export function parseNumericValue(value: string | number): number | null {
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  const cleaned = String(value).replace(/[$€£¥₹₩₪₫₱,\s]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALUE FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a value for display based on data type.
 * Unified implementation for all components.
 */
export function formatValue(
  value: unknown,
  dataType: SimpleDataType,
  options?: FormatOptions
): string {
  if (value === null || value === undefined || value === '') return '';

  const strValue = String(value);

  switch (dataType) {
    case 'currency': {
      const num = parseNumericValue(strValue);
      if (num === null) return strValue;
      try {
        return new Intl.NumberFormat(options?.locale, {
          style: 'currency',
          currency: options?.currency ?? getLocaleCurrency(),
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
      } catch {
        return new Intl.NumberFormat(options?.locale, {
          style: 'currency',
          currency: 'USD',
        }).format(num);
      }
    }

    case 'number': {
      const num = parseNumericValue(strValue);
      if (num === null) return strValue;
      return num.toLocaleString(options?.locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: options?.precision ?? 2,
      });
    }

    case 'date': {
      const iso = parseDateString(strValue);
      if (!iso) return strValue;
      // Parse ISO parts directly - no Date object to avoid timezone offset bugs
      const [yyyy, mm, dd] = iso.split('-');
      return `${dd}/${mm}/${yyyy}`;
    }

    case 'boolean': {
      const lower = strValue.toLowerCase();
      if (lower === 'yes' || lower === 'true' || lower === '1') return 'Yes';
      if (lower === 'no' || lower === 'false' || lower === '0') return 'No';
      return 'Unknown';
    }

    case 'string':
    default:
      return strValue;
  }
}

/**
 * Format a date string for use in an HTML date input (YYYY-MM-DD format).
 * Uses parseDateString to avoid timezone offset bugs from toISOString().
 */
export function formatDateForInput(value: string): string {
  if (!value) return '';
  return parseDateString(value) ?? '';
}

/**
 * Format a date for localized display.
 */
export function formatDateDisplay(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate a value against a data type.
 */
export function validateValue(value: string, dataType: SimpleDataType): ValidationResult {
  if (!value.trim()) return { valid: true };

  switch (dataType) {
    case 'number':
    case 'currency': {
      const num = parseNumericValue(value);
      return num === null
        ? { valid: false, message: 'Invalid number' }
        : { valid: true };
    }
    case 'date':
      return isNaN(new Date(value).getTime())
        ? { valid: false, message: 'Invalid date (use YYYY-MM-DD)' }
        : { valid: true };
    default:
      return { valid: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOLEAN HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a boolean value from various string representations.
 */
export function parseBooleanValue(value: string): 'yes' | 'no' | 'unknown' {
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'true' || lower === '1') return 'yes';
  if (lower === 'no' || lower === 'false' || lower === '0') return 'no';
  return 'unknown';
}

/**
 * Convert a string or boolean value to a boolean.
 */
export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const strVal = String(value).toLowerCase();
  return strVal === 'yes' || strVal === 'true' || strVal === '1';
}
