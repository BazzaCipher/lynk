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
// NUMERIC PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a string value to a number, handling currency symbols, commas, and various formats.
 */
export function parseNumericValue(value: string | number): number | null {
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  const cleaned = String(value).replace(/[$€£¥₹,\s]/g, '').trim();
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
      const date = new Date(strValue);
      if (isNaN(date.getTime())) return strValue;
      // Format as DD/MM/YYYY
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
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
 */
export function formatDateForInput(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
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
