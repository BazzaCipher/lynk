/**
 * Parse full-page OCR output into a structured table (rows x columns).
 *
 * Strategy:
 *  1. Treat each detected OCR line as a row.
 *  2. Collect word x-start positions across all lines, cluster 1D by gap to
 *     discover column anchors.
 *  3. Assign each word to its nearest column anchor; words in the same column
 *     within a row are joined with a space.
 *  4. Optionally treat the first row as a header if its cells look like labels.
 */

import type { FullPageOcrResult, OcrLine, OcrWord } from './ocrExtractor';

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  /** Whether the first OCR line was used as headers (vs synthesised). */
  headerDetected: boolean;
}

const DEFAULT_COLUMN_TOLERANCE_PX = 20;

function clusterX(positions: number[], tolerance: number): number[] {
  if (positions.length === 0) return [];
  const sorted = [...positions].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = clusters[clusters.length - 1];
    const lastVal = last[last.length - 1];
    if (sorted[i] - lastVal <= tolerance) last.push(sorted[i]);
    else clusters.push([sorted[i]]);
  }
  return clusters.map((c) => c.reduce((s, v) => s + v, 0) / c.length);
}

function assignToAnchor(word: OcrWord, anchors: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < anchors.length; i++) {
    const d = Math.abs(word.bbox.x0 - anchors[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function lineToRow(line: OcrLine, anchors: number[]): string[] {
  const cells: string[][] = anchors.map(() => []);
  for (const word of line.words) {
    const col = assignToAnchor(word, anchors);
    cells[col].push(word.text);
  }
  return cells.map((c) => c.join(' ').trim());
}

function looksLikeHeader(cells: string[]): boolean {
  const nonEmpty = cells.filter((c) => c.length > 0);
  if (nonEmpty.length === 0) return false;
  // Header if most cells are non-numeric.
  const numeric = nonEmpty.filter((c) => /^[$€£]?[\d,.\s-]+%?$/.test(c.trim())).length;
  return numeric / nonEmpty.length < 0.4;
}

export interface ParseTableOptions {
  columnTolerance?: number;
  /** Optional filter: only include lines whose y-center falls in this range. */
  yRange?: { min: number; max: number };
}

export function parseTableFromOcr(
  ocr: FullPageOcrResult,
  options: ParseTableOptions = {},
): ParsedTable {
  const tolerance = options.columnTolerance ?? DEFAULT_COLUMN_TOLERANCE_PX;
  const yRange = options.yRange;

  const candidateLines = ocr.lines.filter((l) => {
    if (l.words.length === 0) return false;
    if (!yRange) return true;
    const yc = (l.bbox.y0 + l.bbox.y1) / 2;
    return yc >= yRange.min && yc <= yRange.max;
  });

  if (candidateLines.length === 0) {
    return { headers: [], rows: [], headerDetected: false };
  }

  const allStarts: number[] = [];
  for (const line of candidateLines) {
    for (const w of line.words) allStarts.push(w.bbox.x0);
  }
  const anchors = clusterX(allStarts, tolerance);
  if (anchors.length === 0) {
    return { headers: [], rows: [], headerDetected: false };
  }

  const allRows = candidateLines.map((l) => lineToRow(l, anchors));

  let headers: string[];
  let rows: string[][];
  let headerDetected = false;
  if (looksLikeHeader(allRows[0])) {
    headers = allRows[0].map((h, i) => h || `Column ${i + 1}`);
    rows = allRows.slice(1);
    headerDetected = true;
  } else {
    headers = anchors.map((_, i) => `Column ${i + 1}`);
    rows = allRows;
  }

  // Drop rows that are fully empty.
  rows = rows.filter((r) => r.some((c) => c.length > 0));

  return { headers, rows, headerDetected };
}
