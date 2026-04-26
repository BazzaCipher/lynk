import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { MatchConfig, MatchMode, MatchResult } from '../../../core/reconciliation/matchEngine';
import type { ExtractorRowsView } from './matchRows';
import { useCanvasStore } from '../../../store/canvasStore';
import { useHighlightActions } from '../../../hooks/useHighlighting';

interface SyncModalProps {
  onClose: () => void;
  leftView: ExtractorRowsView;
  rightView: ExtractorRowsView;
  result: MatchResult;
  config: MatchConfig;
  onConfigChange: (next: Partial<MatchConfig>) => void;
  leftNodeId: string;
  rightNodeId: string;
}

const rowClass = (status: 'matched' | 'partial' | 'unmatched') => {
  if (status === 'matched') return 'bg-green-50';
  if (status === 'partial') return 'bg-yellow-50';
  return 'bg-red-50';
};

export function SyncModal({
  onClose,
  leftView,
  rightView,
  result,
  config,
  onConfigChange,
  leftNodeId,
  rightNodeId,
}: SyncModalProps) {
  const setFocusedGroup = useCanvasStore((s) => s.setFocusedGroup);
  const { set: setHighlight, clear: clearHighlight } = useHighlightActions();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Clear highlight when drawer closes
  useEffect(() => () => { clearHighlight(); }, [clearHighlight]);

  const leftById = useMemo(() => new Map(leftView.rows.map((r) => [r.id, r])), [leftView.rows]);
  const rightById = useMemo(() => new Map(rightView.rows.map((r) => [r.id, r])), [rightView.rows]);

  const handleRowClick = (nodeId: string, rowId: string) => {
    if (!nodeId) return;
    setFocusedGroup(null);
    setHighlight(nodeId, rowId);
  };

  return createPortal(
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl border-l border-paper-200"
      style={{ width: 680 }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-paper-200 flex-shrink-0">
        <h2 className="text-sm font-medium text-bridge-900">Reconciliation</h2>
        <button
          onClick={onClose}
          className="p-1 text-bridge-400 hover:text-bridge-600 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Config panel */}
      <div className="px-4 py-2.5 border-b border-paper-200 flex items-center gap-3 text-sm flex-wrap flex-shrink-0 bg-paper-50">
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-bridge-500">Mode</span>
          <select
            value={config.mode}
            onChange={(e) => onConfigChange({ mode: e.target.value as MatchMode })}
            className="border border-paper-300 rounded px-1.5 py-0.5 text-xs"
          >
            <option value="exact">Exact</option>
            <option value="fuzzy">Fuzzy</option>
            <option value="tolerance">Tolerance</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-bridge-500">Key A</span>
          <select
            value={config.keyColumnLeft ?? ''}
            onChange={(e) => onConfigChange({ keyColumnLeft: e.target.value })}
            className="border border-paper-300 rounded px-1.5 py-0.5 text-xs"
          >
            {leftView.columns.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-xs text-bridge-500">Key B</span>
          <select
            value={config.keyColumnRight ?? ''}
            onChange={(e) => onConfigChange({ keyColumnRight: e.target.value })}
            className="border border-paper-300 rounded px-1.5 py-0.5 text-xs"
          >
            {rightView.columns.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>

        {config.mode === 'tolerance' && (
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-bridge-500">Tolerance</span>
            <input
              type="number"
              step="0.01"
              value={config.tolerance ?? 0}
              onChange={(e) => onConfigChange({ tolerance: Number(e.target.value) || 0 })}
              className="w-16 border border-paper-300 rounded px-1.5 py-0.5 text-xs"
            />
          </label>
        )}

        {config.mode === 'fuzzy' && (
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-bridge-500">Threshold</span>
            <input
              type="number"
              step="0.05"
              min={0}
              max={1}
              value={config.fuzzyThreshold ?? 0.8}
              onChange={(e) => onConfigChange({ fuzzyThreshold: Number(e.target.value) || 0.8 })}
              className="w-16 border border-paper-300 rounded px-1.5 py-0.5 text-xs"
            />
          </label>
        )}

        <div className="ml-auto text-xs text-bridge-500 tabular-nums flex gap-2">
          <span className="text-green-600">{result.pairs.filter((p) => p.status === 'matched').length} matched</span>
          <span className="text-yellow-600">{result.pairs.filter((p) => p.status === 'partial').length} partial</span>
          <span className="text-red-600">{result.unmatchedLeft.length + result.unmatchedRight.length} unmatched</span>
        </div>
      </div>

      {/* Side-by-side tables */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-paper-200 overflow-hidden">
        <SideTable
          title={`A: ${leftView.label}`}
          columns={leftView.columns}
          onRowClick={(rid) => handleRowClick(leftNodeId, rid)}
        >
          {result.pairs.map((p) => {
            const row = leftById.get(p.leftRowId);
            if (!row) return null;
            return (
              <tr key={p.id} className={`${rowClass(p.status)} cursor-pointer hover:brightness-95`} onClick={() => handleRowClick(leftNodeId, p.leftRowId)}>
                {leftView.columns.map((c) => (
                  <td key={c.id} className="px-2 py-1 border-b border-paper-100 text-xs">{String(row.cells[c.id] ?? '')}</td>
                ))}
              </tr>
            );
          })}
          {result.unmatchedLeft.map((rid) => {
            const row = leftById.get(rid);
            if (!row) return null;
            return (
              <tr key={rid} className="bg-red-50 cursor-pointer hover:brightness-95" onClick={() => handleRowClick(leftNodeId, rid)}>
                {leftView.columns.map((c) => (
                  <td key={c.id} className="px-2 py-1 border-b border-paper-100 text-xs">{String(row.cells[c.id] ?? '')}</td>
                ))}
              </tr>
            );
          })}
        </SideTable>

        <SideTable
          title={`B: ${rightView.label}`}
          columns={rightView.columns}
          onRowClick={(rid) => handleRowClick(rightNodeId, rid)}
        >
          {result.pairs.map((p) => {
            const row = rightById.get(p.rightRowId);
            if (!row) return null;
            return (
              <tr key={p.id} className={`${rowClass(p.status)} cursor-pointer hover:brightness-95`} onClick={() => handleRowClick(rightNodeId, p.rightRowId)}>
                {rightView.columns.map((c) => (
                  <td key={c.id} className="px-2 py-1 border-b border-paper-100 text-xs">{String(row.cells[c.id] ?? '')}</td>
                ))}
              </tr>
            );
          })}
          {result.unmatchedRight.map((rid) => {
            const row = rightById.get(rid);
            if (!row) return null;
            return (
              <tr key={rid} className="bg-red-50 cursor-pointer hover:brightness-95" onClick={() => handleRowClick(rightNodeId, rid)}>
                {rightView.columns.map((c) => (
                  <td key={c.id} className="px-2 py-1 border-b border-paper-100 text-xs">{String(row.cells[c.id] ?? '')}</td>
                ))}
              </tr>
            );
          })}
        </SideTable>
      </div>

      {/* Hint */}
      <div className="px-4 py-2 border-t border-paper-200 text-xs text-bridge-400 flex-shrink-0 bg-paper-50">
        Click a row to highlight it on the canvas
      </div>
    </div>,
    document.body,
  );
}

interface SideTableProps {
  title: string;
  columns: ExtractorRowsView['columns'];
  onRowClick: (rowId: string) => void;
  children: React.ReactNode;
}

function SideTable({ title, columns, children }: SideTableProps) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="px-3 py-2 bg-paper-50 border-b border-paper-200 text-xs font-medium text-bridge-700 flex-shrink-0">
        {title}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white shadow-sm">
            <tr>
              {columns.map((c) => (
                <th key={c.id} className="px-2 py-1.5 text-xs font-medium text-bridge-600 border-b border-paper-200">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
