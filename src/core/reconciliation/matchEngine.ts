/**
 * Match Engine
 *
 * Pair rows between two sources (left/right) by a key column, then compare
 * configured value columns to classify each pair as matched or partial.
 * Unmatched rows on either side are returned separately.
 */

export type MatchMode = 'exact' | 'fuzzy' | 'tolerance';

export interface MatchConfig {
  mode: MatchMode;
  /** Absolute numeric tolerance applied to tolerance-mode key matching and compare columns. */
  tolerance?: number;
  /** Percent tolerance (0-1) applied to compare columns. If set with `tolerance`, either passing qualifies. */
  percentTolerance?: number;
  /** Day window used when compare columns hold dates. */
  dateRange?: number;
  /** Minimum similarity (0-1) for fuzzy key matching. Default 0.8. */
  fuzzyThreshold?: number;
  keyColumnLeft?: string;
  keyColumnRight?: string;
  compareColumns?: Array<{ left: string; right: string }>;
}

export type MatchStatus = 'matched' | 'partial' | 'unmatched';

export interface MatchPair {
  id: string;
  leftRowId: string;
  rightRowId: string;
  status: MatchStatus;
  /** Per compare-column delta. Numeric diff when both sides numeric, NaN otherwise. */
  deltas: Record<string, number>;
}

export interface MatchRow {
  id: string;
  cells: Record<string, unknown>;
}

export interface MatchResult {
  pairs: MatchPair[];
  unmatchedLeft: string[];
  unmatchedRight: string[];
}

function normalizeKey(raw: unknown): string {
  if (raw == null) return '';
  return String(raw).trim().toLowerCase();
}

function asNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[$,\s]/g, '');
    if (cleaned === '') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asDate(raw: unknown): number | null {
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === 'string' && raw.trim() !== '') {
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

/** Levenshtein distance, bounded at inputs' max length. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

function compareCells(
  leftVal: unknown,
  rightVal: unknown,
  config: MatchConfig
): { equal: boolean; delta: number } {
  const ln = asNumber(leftVal);
  const rn = asNumber(rightVal);
  if (ln !== null && rn !== null) {
    const delta = ln - rn;
    const abs = Math.abs(delta);
    const tol = config.tolerance ?? 0;
    const pct = config.percentTolerance ?? 0;
    const pctAllowed = pct > 0 ? Math.abs(ln) * pct : 0;
    const equal = abs <= Math.max(tol, pctAllowed);
    return { equal, delta };
  }

  if (config.dateRange !== undefined) {
    const ld = asDate(leftVal);
    const rd = asDate(rightVal);
    if (ld !== null && rd !== null) {
      const deltaDays = (ld - rd) / 86_400_000;
      return { equal: Math.abs(deltaDays) <= config.dateRange, delta: deltaDays };
    }
  }

  const ls = normalizeKey(leftVal);
  const rs = normalizeKey(rightVal);
  return { equal: ls === rs, delta: NaN };
}

export function runMatch(
  left: MatchRow[],
  right: MatchRow[],
  config: MatchConfig
): MatchResult {
  const { mode, keyColumnLeft, keyColumnRight } = config;
  const pairs: MatchPair[] = [];
  const usedRight = new Set<string>();

  if (!keyColumnLeft || !keyColumnRight) {
    return { pairs: [], unmatchedLeft: left.map((r) => r.id), unmatchedRight: right.map((r) => r.id) };
  }

  const pickRight = (leftRow: MatchRow): MatchRow | null => {
    const leftKey = leftRow.cells[keyColumnLeft];
    const candidates = right.filter((r) => !usedRight.has(r.id));
    if (mode === 'exact') {
      const target = normalizeKey(leftKey);
      if (!target) return null;
      return candidates.find((r) => normalizeKey(r.cells[keyColumnRight]) === target) ?? null;
    }
    if (mode === 'tolerance') {
      const ln = asNumber(leftKey);
      if (ln === null) return null;
      const tol = config.tolerance ?? 0;
      let best: { row: MatchRow; diff: number } | null = null;
      for (const r of candidates) {
        const rn = asNumber(r.cells[keyColumnRight]);
        if (rn === null) continue;
        const diff = Math.abs(ln - rn);
        if (diff <= tol && (!best || diff < best.diff)) best = { row: r, diff };
      }
      return best?.row ?? null;
    }
    // fuzzy
    const threshold = config.fuzzyThreshold ?? 0.8;
    const ls = normalizeKey(leftKey);
    if (!ls) return null;
    let best: { row: MatchRow; score: number } | null = null;
    for (const r of candidates) {
      const rs = normalizeKey(r.cells[keyColumnRight]);
      if (!rs) continue;
      const score = similarity(ls, rs);
      if (score >= threshold && (!best || score > best.score)) best = { row: r, score };
    }
    return best?.row ?? null;
  };

  let pairCounter = 0;
  const unmatchedLeft: string[] = [];
  for (const leftRow of left) {
    const rightRow = pickRight(leftRow);
    if (!rightRow) {
      unmatchedLeft.push(leftRow.id);
      continue;
    }
    usedRight.add(rightRow.id);

    const deltas: Record<string, number> = {};
    let anyMismatch = false;
    for (const col of config.compareColumns ?? []) {
      const { equal, delta } = compareCells(leftRow.cells[col.left], rightRow.cells[col.right], config);
      deltas[col.left] = delta;
      if (!equal) anyMismatch = true;
    }

    pairs.push({
      id: `pair-${pairCounter++}`,
      leftRowId: leftRow.id,
      rightRowId: rightRow.id,
      status: anyMismatch ? 'partial' : 'matched',
      deltas,
    });
  }

  const unmatchedRight = right.filter((r) => !usedRight.has(r.id)).map((r) => r.id);
  return { pairs, unmatchedLeft, unmatchedRight };
}
