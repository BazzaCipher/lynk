import { describe, it, expect } from 'vitest';
import { runMatch, type MatchRow, type MatchConfig } from '../../core/reconciliation/matchEngine';

const left: MatchRow[] = [
  { id: 'L1', cells: { ref: 'INV-001', amount: '150.00' } },
  { id: 'L2', cells: { ref: 'INV-002', amount: '200.00' } },
  { id: 'L3', cells: { ref: 'INV-003', amount: '75.00' } },
];

const right: MatchRow[] = [
  { id: 'R1', cells: { ref: 'INV-001', amount: '150.00' } },
  { id: 'R2', cells: { ref: 'INV-002', amount: '199.50' } },
  { id: 'R4', cells: { ref: 'INV-004', amount: '10.00' } },
];

describe('runMatch — exact mode', () => {
  const baseConfig: MatchConfig = {
    mode: 'exact',
    keyColumnLeft: 'ref',
    keyColumnRight: 'ref',
    compareColumns: [{ left: 'amount', right: 'amount' }],
  };

  it('pairs by key and flags value mismatches as partial', () => {
    const result = runMatch(left, right, baseConfig);
    expect(result.pairs).toHaveLength(2);
    const byLeft = Object.fromEntries(result.pairs.map((p) => [p.leftRowId, p]));
    expect(byLeft.L1.status).toBe('matched');
    expect(byLeft.L2.status).toBe('partial');
    expect(byLeft.L2.deltas.amount).toBeCloseTo(0.5, 5);
    expect(result.unmatchedLeft).toEqual(['L3']);
    expect(result.unmatchedRight).toEqual(['R4']);
  });

  it('accepts value differences within tolerance', () => {
    const result = runMatch(left, right, { ...baseConfig, tolerance: 1 });
    const byLeft = Object.fromEntries(result.pairs.map((p) => [p.leftRowId, p]));
    expect(byLeft.L2.status).toBe('matched');
  });

  it('accepts value differences within percent tolerance', () => {
    const result = runMatch(left, right, { ...baseConfig, percentTolerance: 0.01 });
    const byLeft = Object.fromEntries(result.pairs.map((p) => [p.leftRowId, p]));
    expect(byLeft.L2.status).toBe('matched');
  });
});

describe('runMatch — fuzzy mode', () => {
  it('pairs approximate string keys', () => {
    const L: MatchRow[] = [{ id: 'L1', cells: { name: 'Acme Corp' } }];
    const R: MatchRow[] = [{ id: 'R1', cells: { name: 'Acme Corporation' } }, { id: 'R2', cells: { name: 'Wayne Ent' } }];
    const result = runMatch(L, R, { mode: 'fuzzy', fuzzyThreshold: 0.5, keyColumnLeft: 'name', keyColumnRight: 'name' });
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].rightRowId).toBe('R1');
  });
});

describe('runMatch — tolerance mode', () => {
  it('matches numeric keys within absolute tolerance', () => {
    const L: MatchRow[] = [{ id: 'L1', cells: { id: 100 } }];
    const R: MatchRow[] = [{ id: 'R1', cells: { id: 102 } }, { id: 'R2', cells: { id: 110 } }];
    const result = runMatch(L, R, { mode: 'tolerance', tolerance: 5, keyColumnLeft: 'id', keyColumnRight: 'id' });
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].rightRowId).toBe('R1');
  });
});

describe('runMatch — edge cases', () => {
  it('returns everything unmatched when key columns are missing', () => {
    const result = runMatch(left, right, { mode: 'exact' });
    expect(result.pairs).toEqual([]);
    expect(result.unmatchedLeft).toHaveLength(3);
    expect(result.unmatchedRight).toHaveLength(3);
  });

  it('does not reuse a right row across multiple left matches', () => {
    const L: MatchRow[] = [
      { id: 'L1', cells: { k: 'A' } },
      { id: 'L2', cells: { k: 'A' } },
    ];
    const R: MatchRow[] = [{ id: 'R1', cells: { k: 'A' } }];
    const result = runMatch(L, R, { mode: 'exact', keyColumnLeft: 'k', keyColumnRight: 'k' });
    expect(result.pairs).toHaveLength(1);
    expect(result.unmatchedLeft).toEqual(['L2']);
  });
});
