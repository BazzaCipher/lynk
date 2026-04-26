import { useState, useMemo, useEffect, useCallback } from 'react';
import { Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { EditableLabel } from './base/EditableLabel';
import { useCanvasStore } from '../../store/canvasStore';
import type { MatchNode as MatchNodeType, ExtractorNode as ExtractorNodeType, LynkNode, MatchConfig } from '../../types';
import { ExtractorNode as ExtractorNodeGuard } from '../../types';
import { runMatch } from '../../core/reconciliation/matchEngine';
import { extractorRows } from './match/matchRows';
import { SyncModal } from './match/SyncModal';

function findSource(nodes: LynkNode[], edges: ReturnType<typeof useCanvasStore.getState>['edges'], selfId: string, handleId: string): ExtractorNodeType | null {
  const edge = edges.find((e) => e.target === selfId && e.targetHandle === handleId);
  if (!edge) return null;
  const src = nodes.find((n) => n.id === edge.source);
  return src && ExtractorNodeGuard.is(src) ? src : null;
}

export function MatchNode({ id, data, selected }: NodeProps<MatchNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const [modalOpen, setModalOpen] = useState(false);

  const left = useMemo(() => findSource(nodes, edges, id, 'source-a'), [nodes, edges, id]);
  const right = useMemo(() => findSource(nodes, edges, id, 'source-b'), [nodes, edges, id]);

  const leftView = useMemo(() => (left ? extractorRows(left) : null), [left]);
  const rightView = useMemo(() => (right ? extractorRows(right) : null), [right]);

  // Auto-pick first column as key when not yet configured
  const effectiveConfig = useMemo<MatchConfig>(() => {
    const cfg = { ...data.config };
    if (!cfg.keyColumnLeft && leftView?.columns.length) cfg.keyColumnLeft = leftView.columns[0].id;
    if (!cfg.keyColumnRight && rightView?.columns.length) cfg.keyColumnRight = rightView.columns[0].id;
    return cfg;
  }, [data.config, leftView, rightView]);

  const result = useMemo(() => {
    if (!leftView || !rightView) return null;
    return runMatch(leftView.rows, rightView.rows, effectiveConfig);
  }, [leftView, rightView, effectiveConfig]);

  // Persist result onto node data for exports/other consumers
  useEffect(() => {
    if (!result) return;
    const nextPairs = result.pairs;
    const same =
      data.pairs.length === nextPairs.length &&
      data.unmatchedLeft.length === result.unmatchedLeft.length &&
      data.unmatchedRight.length === result.unmatchedRight.length &&
      nextPairs.every((p, i) => data.pairs[i]?.id === p.id && data.pairs[i]?.status === p.status);
    if (same) return;
    updateNodeData(id, {
      pairs: nextPairs,
      unmatchedLeft: result.unmatchedLeft,
      unmatchedRight: result.unmatchedRight,
    });
  }, [result, data.pairs, data.unmatchedLeft, data.unmatchedRight, id, updateNodeData]);

  const counts = useMemo(() => {
    const matched = result?.pairs.filter((p) => p.status === 'matched').length ?? 0;
    const partial = result?.pairs.filter((p) => p.status === 'partial').length ?? 0;
    const unmatched = (result?.unmatchedLeft.length ?? 0) + (result?.unmatchedRight.length ?? 0);
    const total = matched + partial + unmatched;
    return { matched, partial, unmatched, total };
  }, [result]);

  const onConfigChange = useCallback(
    (next: Partial<MatchConfig>) => {
      updateNodeData(id, { config: { ...data.config, ...next } });
    },
    [id, data.config, updateNodeData]
  );

  return (
    <BaseNode
      label={data.label}
      selected={selected}
      renderHeader={
        <EditableLabel
          value={data.label}
          onSave={(v) => updateNodeData(id, { label: v })}
          variant="header"
        />
      }
    >
      <div className="relative">
        <NodeEntry id="source-a" handleType="target" handlePosition={Position.Left}>
          <div className="text-xs text-bridge-500 truncate flex-1">
            {leftView ? `A: ${leftView.label}` : <span className="text-bridge-400">Connect source A</span>}
          </div>
        </NodeEntry>
        <NodeEntry id="source-b" handleType="target" handlePosition={Position.Left}>
          <div className="text-xs text-bridge-500 truncate flex-1">
            {rightView ? `B: ${rightView.label}` : <span className="text-bridge-400">Connect source B</span>}
          </div>
        </NodeEntry>

        {/* Proportion bar */}
        <div className="px-2 py-1.5">
          {counts.total > 0 ? (
            <>
              <div className="h-2 rounded overflow-hidden flex bg-paper-100">
                <div className="bg-green-500" style={{ width: `${(counts.matched / counts.total) * 100}%` }} />
                <div className="bg-yellow-400" style={{ width: `${(counts.partial / counts.total) * 100}%` }} />
                <div className="bg-red-500" style={{ width: `${(counts.unmatched / counts.total) * 100}%` }} />
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-bridge-500 tabular-nums">
                <span className="text-green-600">{counts.matched} matched</span>
                <span className="text-yellow-600">{counts.partial} partial</span>
                <span className="text-red-600">{counts.unmatched} unmatched</span>
              </div>
            </>
          ) : (
            <div className="text-[11px] text-bridge-400 italic">No data to reconcile</div>
          )}
        </div>

        <div className="px-2 pb-1.5">
          <button
            type="button"
            className="w-full px-2 py-1 text-xs bg-copper-400/10 hover:bg-copper-400/20 text-copper-700 rounded border border-copper-400/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(true);
            }}
            disabled={!leftView || !rightView}
          >
            Open Sync View
          </button>
        </div>

        <NodeEntry id="matched" handleType="source" handlePosition={Position.Right}>
          <div className="text-[10px] text-bridge-400 flex-1 text-right pr-2">matched</div>
        </NodeEntry>
        <NodeEntry id="unmatched-a" handleType="source" handlePosition={Position.Right}>
          <div className="text-[10px] text-bridge-400 flex-1 text-right pr-2">unmatched A</div>
        </NodeEntry>
        <NodeEntry id="unmatched-b" handleType="source" handlePosition={Position.Right}>
          <div className="text-[10px] text-bridge-400 flex-1 text-right pr-2">unmatched B</div>
        </NodeEntry>
      </div>

      {modalOpen && leftView && rightView && result && (
        <SyncModal
          onClose={() => setModalOpen(false)}
          leftView={leftView}
          rightView={rightView}
          result={result}
          config={effectiveConfig}
          onConfigChange={onConfigChange}
          leftNodeId={left?.id ?? ''}
          rightNodeId={right?.id ?? ''}
        />
      )}
    </BaseNode>
  );
}
