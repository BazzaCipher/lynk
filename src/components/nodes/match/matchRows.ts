/**
 * Adapter: turn an ExtractorNode's regions into MatchRow records for the match engine.
 */

import type { ExtractorNode, ExtractorColumn } from '../../../types';
import type { MatchRow } from '../../../core/reconciliation/matchEngine';
import { DEFAULT_EXTRACTOR_COLUMNS } from '../../canvas/nodeDefaults';

export interface ExtractorRowsView {
  rows: MatchRow[];
  columns: ExtractorColumn[];
  label: string;
}

export function extractorRows(node: ExtractorNode): ExtractorRowsView {
  const columns = node.data.columns ?? DEFAULT_EXTRACTOR_COLUMNS;
  const rows: MatchRow[] = node.data.regions.map((r) => {
    const cells: Record<string, unknown> = { ...(r.cells ?? {}) };
    cells.label = r.label;
    cells.value = r.extractedData?.value ?? '';
    return { id: r.id, cells };
  });
  return { rows, columns, label: node.data.label };
}
