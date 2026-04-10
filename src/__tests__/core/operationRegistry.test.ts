import { describe, it, expect } from 'vitest';
import {
  getOperation,
  getOperationsByCategory,
  isTypeCompatible,
  getCompatibleOperations,
  getOperationIds,
  OPERATIONS,
  type OperationInput,
} from '../../core/operations/operationRegistry';

function makeInput(value: number | string, dataType = 'number' as const, label = 'test'): OperationInput {
  return { value, dataType, label, sourceNodeId: 'n1', sourceRegionId: 'r1', edgeId: 'e1' };
}

describe('getOperation', () => {
  it('returns operation by id', () => {
    expect(getOperation('sum')?.label).toBe('Sum');
  });

  it('returns undefined for unknown id', () => {
    expect(getOperation('nonexistent')).toBeUndefined();
  });
});

describe('getOperationsByCategory', () => {
  it('returns operations grouped by category', () => {
    const grouped = getOperationsByCategory();
    expect(grouped.multiple.length).toBeGreaterThan(0);
    expect(grouped.single.length).toBeGreaterThan(0);
    expect(grouped.multiple.every(op => op.category === 'multiple')).toBe(true);
    expect(grouped.single.every(op => op.category === 'single')).toBe(true);
  });
});

describe('isTypeCompatible', () => {
  it('returns true for compatible types', () => {
    expect(isTypeCompatible('sum', 'number')).toBe(true);
    expect(isTypeCompatible('sum', 'currency')).toBe(true);
  });

  it('returns false for incompatible types', () => {
    expect(isTypeCompatible('sum', 'string')).toBe(false);
    expect(isTypeCompatible('sum', 'date')).toBe(false);
  });

  it('returns false for unknown operation', () => {
    expect(isTypeCompatible('nonexistent', 'number')).toBe(false);
  });
});

describe('getCompatibleOperations', () => {
  it('returns all operations when no input types', () => {
    expect(getCompatibleOperations([])).toEqual(OPERATIONS);
  });

  it('filters by input types', () => {
    const ops = getCompatibleOperations(['date']);
    expect(ops.some(op => op.id === 'max')).toBe(true);
    expect(ops.some(op => op.id === 'sum')).toBe(false);
  });
});

describe('getOperationIds', () => {
  it('returns all operation ids', () => {
    const ids = getOperationIds();
    expect(ids).toContain('sum');
    expect(ids).toContain('round');
    expect(ids.length).toBe(OPERATIONS.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Operation calculate functions
// ═══════════════════════════════════════════════════════════════════════════════

describe('sum.calculate', () => {
  const sum = getOperation('sum')!;

  it('sums numbers', () => {
    const result = sum.calculate([makeInput(10), makeInput(20), makeInput(30)], 2);
    expect(result?.value).toBe(60);
  });

  it('returns null for empty inputs', () => {
    expect(sum.calculate([], 2)).toBeNull();
  });

  it('handles string numbers', () => {
    const result = sum.calculate([makeInput('$1,000'), makeInput('500')], 2);
    expect(result?.value).toBe(1500);
  });
});

describe('count.calculate', () => {
  const count = getOperation('count')!;

  it('counts inputs', () => {
    expect(count.calculate([makeInput(1), makeInput(2), makeInput(3)], 0)?.value).toBe(3);
  });

  it('returns 0 for empty inputs', () => {
    expect(count.calculate([], 0)?.value).toBe(0);
  });
});

describe('average.calculate', () => {
  const avg = getOperation('average')!;

  it('calculates average', () => {
    const result = avg.calculate([makeInput(10), makeInput(20)], 2);
    expect(result?.value).toBe(15);
  });

  it('returns null for empty inputs', () => {
    expect(avg.calculate([], 2)).toBeNull();
  });
});

describe('max.calculate', () => {
  const max = getOperation('max')!;

  it('finds max number', () => {
    expect(max.calculate([makeInput(5), makeInput(10), makeInput(3)], 0)?.value).toBe(10);
  });

  it('finds max date', () => {
    const inputs: OperationInput[] = [
      { ...makeInput('2025-01-01'), dataType: 'date' },
      { ...makeInput('2025-06-15'), dataType: 'date' },
    ];
    expect(max.calculate(inputs, 0)?.value).toBe('2025-06-15');
  });

  it('returns null for empty', () => {
    expect(max.calculate([], 0)).toBeNull();
  });
});

describe('min.calculate', () => {
  const min = getOperation('min')!;

  it('finds min number', () => {
    expect(min.calculate([makeInput(5), makeInput(10), makeInput(3)], 0)?.value).toBe(3);
  });

  it('finds min date', () => {
    const inputs: OperationInput[] = [
      { ...makeInput('2025-06-15'), dataType: 'date' },
      { ...makeInput('2025-01-01'), dataType: 'date' },
    ];
    expect(min.calculate(inputs, 0)?.value).toBe('2025-01-01');
  });
});

describe('subtract.calculate', () => {
  const subtract = getOperation('subtract')!;

  it('subtracts second from first', () => {
    expect(subtract.calculate([makeInput(100), makeInput(30)], 2)?.value).toBe(70);
  });

  it('returns null for < 2 inputs', () => {
    expect(subtract.calculate([makeInput(100)], 2)).toBeNull();
  });
});

describe('multiply.calculate', () => {
  const multiply = getOperation('multiply')!;

  it('multiplies all inputs', () => {
    expect(multiply.calculate([makeInput(3), makeInput(4), makeInput(5)], 0)?.value).toBe(60);
  });
});

describe('negate.calculate', () => {
  const negate = getOperation('negate')!;

  it('negates a number', () => {
    expect(negate.calculate([makeInput(42)], 2)?.value).toBe(-42);
  });

  it('negates a negative', () => {
    expect(negate.calculate([makeInput(-10)], 2)?.value).toBe(10);
  });

  it('returns null for empty', () => {
    expect(negate.calculate([], 2)).toBeNull();
  });
});

describe('round.calculate', () => {
  const round = getOperation('round')!;

  it('rounds to precision', () => {
    expect(round.calculate([makeInput(3.14159)], 2)?.value).toBe(3.14);
  });

  it('rounds to 0 decimals', () => {
    expect(round.calculate([makeInput(3.7)], 0)?.value).toBe(4);
  });
});
