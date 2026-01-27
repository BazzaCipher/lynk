/**
 * Operation Registry for Calculation Nodes
 *
 * This module defines the available calculation operations using an extensible
 * registry pattern. To add a new operation:
 *
 * 1. Define it following the OperationDefinition interface
 * 2. Add it to the OPERATIONS array under the appropriate category
 * 3. The UI will automatically include it in the dropdown
 *
 * Operations are categorized as:
 * - 'multiple': Accept multiple input connections (Sum, Count, Avg, Max, Min)
 * - 'single': Accept exactly one input connection (Round)
 */

import type { SimpleDataType } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Operation category determines the input behavior:
 * - 'multiple': Accepts multiple input connections
 * - 'single': Accepts exactly one input connection
 */
export type OperationCategory = 'multiple' | 'single';

/**
 * Structured input to an operation with type information.
 * This allows operations to handle different data types appropriately.
 */
export interface OperationInput {
  /** The actual value (number for numeric types, string for dates/text) */
  value: number | string | boolean | Date;
  /** The declared data type of this input */
  dataType: SimpleDataType;
  /** Human-readable label for display */
  label: string;
  /** Source node ID for traceability */
  sourceNodeId: string;
  /** Source region/handle ID for traceability */
  sourceRegionId: string;
  /** Edge ID for disconnection when switching operations */
  edgeId: string;
}

/**
 * Structured output from an operation.
 * Includes the result value and its data type (may differ from inputs).
 */
export interface OperationResult {
  /** The computed value */
  value: number | string | Date;
  /** The data type of the result */
  dataType: SimpleDataType;
}

/**
 * Definition of a calculation operation.
 *
 * This interface enables the extensible registry pattern. Each operation
 * defines its own calculation logic, compatible types, and constraints.
 */
export interface OperationDefinition {
  /** Unique identifier used in storage and code */
  id: string;

  /** Display label shown in the UI dropdown */
  label: string;

  /** Category for dropdown grouping ('multiple' or 'single') */
  category: OperationCategory;

  /** Human-readable description for tooltips/help */
  description: string;

  /** Data types this operation can accept as inputs */
  compatibleTypes: SimpleDataType[];

  /**
   * The calculation function.
   *
   * Receives typed inputs and precision setting, returns typed result.
   * Handles type coercion internally (e.g., dates to timestamps for comparison).
   *
   * @param inputs - Array of structured inputs with type information
   * @param precision - Decimal precision for numeric results
   * @returns OperationResult with value and dataType, or null if calculation fails
   */
  calculate: (inputs: OperationInput[], precision: number) => OperationResult | null;

  /** Minimum number of inputs required (default: 1) */
  minInputs?: number;

  /** Maximum number of inputs allowed (undefined = unlimited) */
  maxInputs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely convert a value to a number, handling strings with currency/formatting.
 * Returns null if the value cannot be converted to a valid number.
 */
function toSafeNumber(value: number | string | boolean | Date): number | null {
  if (typeof value === 'number') return isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[,$]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const OPERATIONS: OperationDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // MULTIPLE INPUT OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'sum',
    label: 'Sum',
    category: 'multiple',
    description: 'Add all input values together',
    compatibleTypes: ['number', 'currency'],
    minInputs: 1,
    calculate: (inputs, precision) => {
      const numbers = inputs.map(inp => toSafeNumber(inp.value)).filter((n): n is number => n !== null);
      if (numbers.length === 0) return null;
      const sum = numbers.reduce((acc, n) => acc + n, 0);
      return {
        value: Number(sum.toFixed(precision)),
        dataType: 'number',
      };
    },
  },

  {
    id: 'count',
    label: 'Count',
    category: 'multiple',
    description: 'Count the number of inputs',
    compatibleTypes: ['string', 'number', 'boolean', 'date', 'currency'],
    minInputs: 0,
    calculate: (inputs) => ({
      value: inputs.length,
      dataType: 'number',
    }),
  },

  {
    id: 'average',
    label: 'Avg',
    category: 'multiple',
    description: 'Calculate the mean of all input values',
    compatibleTypes: ['number', 'currency'],
    minInputs: 1,
    calculate: (inputs, precision) => {
      const numbers = inputs.map(inp => toSafeNumber(inp.value)).filter((n): n is number => n !== null);
      if (numbers.length === 0) return null;
      const sum = numbers.reduce((acc, n) => acc + n, 0);
      const avg = sum / numbers.length;
      return {
        value: Number(avg.toFixed(precision)),
        dataType: 'number',
      };
    },
  },

  {
    id: 'max',
    label: 'Max',
    category: 'multiple',
    description: 'Find the maximum value (supports dates)',
    compatibleTypes: ['number', 'currency', 'date'],
    minInputs: 1,
    calculate: (inputs) => {
      if (inputs.length === 0) return null;

      // Check if we're dealing with dates
      const isDate = inputs[0].dataType === 'date';

      if (isDate) {
        // Compare dates, return the max date as ISO string
        const timestamps = inputs.map((inp) => new Date(inp.value as string).getTime());
        const maxTime = Math.max(...timestamps);
        const maxInput = inputs.find(
          (inp) => new Date(inp.value as string).getTime() === maxTime
        );
        return {
          value: maxInput!.value as string,
          dataType: 'date',
        };
      }

      // Numeric comparison
      const numbers = inputs.map(inp => toSafeNumber(inp.value)).filter((n): n is number => n !== null);
      if (numbers.length === 0) return null;
      return {
        value: Math.max(...numbers),
        dataType: 'number',
      };
    },
  },

  {
    id: 'min',
    label: 'Min',
    category: 'multiple',
    description: 'Find the minimum value (supports dates)',
    compatibleTypes: ['number', 'currency', 'date'],
    minInputs: 1,
    calculate: (inputs) => {
      if (inputs.length === 0) return null;

      // Check if we're dealing with dates
      const isDate = inputs[0].dataType === 'date';

      if (isDate) {
        // Compare dates, return the min date as ISO string
        const timestamps = inputs.map((inp) => new Date(inp.value as string).getTime());
        const minTime = Math.min(...timestamps);
        const minInput = inputs.find(
          (inp) => new Date(inp.value as string).getTime() === minTime
        );
        return {
          value: minInput!.value as string,
          dataType: 'date',
        };
      }

      // Numeric comparison
      const numbers = inputs.map(inp => toSafeNumber(inp.value)).filter((n): n is number => n !== null);
      if (numbers.length === 0) return null;
      return {
        value: Math.min(...numbers),
        dataType: 'number',
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SINGLE INPUT OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'round',
    label: 'Round',
    category: 'single',
    description: 'Round to the specified precision',
    compatibleTypes: ['number', 'currency'],
    minInputs: 1,
    maxInputs: 1,
    calculate: (inputs, precision) => {
      if (inputs.length === 0) return null;
      const num = toSafeNumber(inputs[0].value);
      if (num === null) return null;
      const factor = Math.pow(10, precision);
      const rounded = Math.round(num * factor) / factor;
      return {
        value: rounded,
        dataType: 'number',
      };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get an operation definition by its ID.
 *
 * @param id - The operation ID (e.g., 'sum', 'max', 'round')
 * @returns The operation definition, or undefined if not found
 */
export function getOperation(id: string): OperationDefinition | undefined {
  return OPERATIONS.find((op) => op.id === id);
}

/**
 * Get all operations grouped by category.
 * Useful for rendering the dropdown with subheaders.
 *
 * @returns Object with 'multiple' and 'single' arrays
 */
export function getOperationsByCategory(): Record<OperationCategory, OperationDefinition[]> {
  return {
    multiple: OPERATIONS.filter((op) => op.category === 'multiple'),
    single: OPERATIONS.filter((op) => op.category === 'single'),
  };
}

/**
 * Check if a data type is compatible with an operation.
 *
 * @param operationId - The operation ID
 * @param dataType - The data type to check
 * @returns true if the type is compatible, false otherwise
 */
export function isTypeCompatible(operationId: string, dataType: SimpleDataType): boolean {
  const op = getOperation(operationId);
  return op ? op.compatibleTypes.includes(dataType) : false;
}

/**
 * Get the list of compatible operations for a given set of input types.
 * Useful for filtering available operations based on current connections.
 *
 * @param inputTypes - Array of data types currently connected
 * @returns Array of operations that accept all the given types
 */
export function getCompatibleOperations(inputTypes: SimpleDataType[]): OperationDefinition[] {
  if (inputTypes.length === 0) return OPERATIONS;
  return OPERATIONS.filter((op) =>
    inputTypes.every((type) => op.compatibleTypes.includes(type))
  );
}

/**
 * Get the display category label for the dropdown subheaders.
 */
export const CATEGORY_LABELS: Record<OperationCategory, string> = {
  multiple: 'Multiple Inputs',
  single: 'Single Input',
};

/**
 * Get all operation IDs as an array.
 * Useful for schema validation.
 */
export function getOperationIds(): string[] {
  return OPERATIONS.map((op) => op.id);
}

/**
 * All operation IDs as a readonly tuple.
 * Used for generating Zod enum schemas dynamically.
 */
export const OPERATION_IDS = OPERATIONS.map((op) => op.id) as [string, ...string[]];
