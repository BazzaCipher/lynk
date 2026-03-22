/**
 * SheetNode Component
 *
 * A hierarchical data aggregator node with:
 * - Subheaders: Groups that aggregate entry outputs with an operation
 * - Entries: Mini CalculationNodes that accept multiple inputs and apply an operation
 *
 * Each entry has input handles (left) for receiving multiple values and output handles (right).
 * Each subheader has an output handle (right) for the aggregated result.
 */

import { useMemo, useEffect, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position, useEdges, useNodes, useReactFlow } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useCanvasStore } from '../../store/canvasStore';
import { useHighlighting, useNodeHighlights } from '../../hooks/useHighlighting';
import { EditableLabel } from './base/EditableLabel';
import { useNodeOutputs } from '../../hooks/useNodeOutputs';
import { type ResolvedInput, resolveNodeOutput } from '../../hooks/useDataFlow';
import { getOperation } from '../../core/operations/operationRegistry';
import { OperationSelect } from '../ui/OperationSelect';
import { DATA_TYPE_COLORS } from '../../utils/colors';
import { formatValue } from '../../utils/formatting';
import { InputRow } from './base/InputRow';
import type {
  SheetNode as SheetNodeType,
  SheetSubheader,
  SheetEntry,
  SheetComputedResult,
  SimpleDataType,
  LynkNode,
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}


// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY ROW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface EntryRowProps {
  entry: SheetEntry;
  subheaderId: string;
  inputs: ResolvedInput[];
  result: SheetComputedResult | null;
  isOutputHighlighted: boolean;
  onUpdateEntry: (entryId: string, updates: Partial<SheetEntry>) => void;
  onDeleteEntry: (entryId: string) => void;
  isHighlighted: (nodeId: string, regionId: string) => boolean;
  onInputHover: (input: ResolvedInput | null) => void;
  onInputClick: (input: ResolvedInput) => void;
  onInputDoubleClick: (input: ResolvedInput) => void;
}

function EntryRow({
  entry,
  subheaderId,
  inputs,
  result,
  isOutputHighlighted,
  onUpdateEntry,
  onDeleteEntry,
  isHighlighted,
  onInputHover,
  onInputClick,
  onInputDoubleClick,
}: EntryRowProps) {
  const outputColor = result
    ? DATA_TYPE_COLORS[result.dataType]?.border || '#6b7280'
    : '#6b7280';

  const resultDisplay = result
    ? formatValue(result.value, result.dataType, { precision: 2 })
    : '—';

  const inputHandleId = `entry-in-${subheaderId}-${entry.id}`;
  const outputHandleId = `entry-out-${subheaderId}-${entry.id}`;

  // Click entry row to cycle-highlight connected sources
  const handleEntryClick = useCallback(() => {
    if (inputs.length === 0) return;
    const idx = inputs.findIndex(
      (inp) => isHighlighted(inp.sourceNodeId, inp.sourceRegionId)
    );
    if (idx === -1) {
      onInputClick(inputs[0]);
    } else if (idx < inputs.length - 1) {
      onInputClick(inputs[idx + 1]);
    } else {
      onInputClick(inputs[idx]); // toggle off
    }
  }, [inputs, isHighlighted, onInputClick]);

  return (
    <div className={`relative border-b border-gray-100 last:border-b-0 ${
      isOutputHighlighted ? 'bg-blue-100 ring-1 ring-blue-400 animate-pulse' : ''
    }`}>
      {/* Handle overlays — absolutely positioned to span full row width for edge alignment */}
      <NodeEntry
        id={inputHandleId}
        handleType="target"
        handlePosition={Position.Left}
        allowMultiple
        className="!absolute !inset-0 !min-h-0 !px-0 pointer-events-none"
      >
        <span className="sr-only">Input</span>
      </NodeEntry>
      <NodeEntry
        id={outputHandleId}
        handleType="source"
        handlePosition={Position.Right}
        handleColor={outputColor}
        className="!absolute !inset-0 !min-h-0 !px-0 pointer-events-none"
      >
        <span className="sr-only">Output</span>
      </NodeEntry>

      {/* Content row — padded to avoid overlapping handle hit areas */}
      <div className="flex items-center gap-1 py-1 px-3 cursor-pointer" onClick={handleEntryClick}>
        {/* Expand/collapse toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateEntry(entry.id, { expanded: !entry.expanded }); }}
          className="p-0.5 hover:bg-gray-100 rounded text-gray-400"
          title={entry.expanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-3 h-3 transition-transform ${entry.expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Editable label */}
        <EditableLabel
          value={entry.label}
          onSave={(newLabel) => onUpdateEntry(entry.id, { label: newLabel })}
        />

        {/* Operation selector */}
        <OperationSelect
          value={entry.operation}
          onChange={(op) => onUpdateEntry(entry.id, { operation: op })}
          variant="compact"
          className="w-14"
        />

        {/* Input count badge */}
        <span className="text-xs text-gray-400 w-5 text-center">{inputs.length}</span>

        {/* Result */}
        <span className="font-mono text-xs text-gray-800 min-w-[50px] text-right">
          {resultDisplay}
        </span>

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
          className="p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
          title="Delete entry"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded input list */}
      {entry.expanded && inputs.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-100">
          {inputs.map((input) => (
            <InputRow
              key={input.edgeId}
              input={input}
              isHighlighted={isHighlighted(input.sourceNodeId, input.sourceRegionId)}
              onHover={onInputHover}
              onClick={onInputClick}
              onDoubleClick={onInputDoubleClick}
              variant="sheet"
            />
          ))}
        </div>
      )}

      {/* Empty state when expanded but no inputs */}
      {entry.expanded && inputs.length === 0 && (
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-2 text-xs text-gray-400 italic">
          No inputs connected
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBHEADER ROW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SubheaderRowProps {
  subheader: SheetSubheader;
  result: SheetComputedResult | null;
  entryInputs: Record<string, ResolvedInput[]>;
  entryResults: Record<string, SheetComputedResult | null>;
  outputHighlights: Record<string, boolean>;
  onUpdateSubheader: (updates: Partial<SheetSubheader>) => void;
  onDeleteSubheader: () => void;
  onAddEntry: () => void;
  onUpdateEntry: (entryId: string, updates: Partial<SheetEntry>) => void;
  onDeleteEntry: (entryId: string) => void;
  isHighlighted: (nodeId: string, regionId: string) => boolean;
  onInputHover: (input: ResolvedInput | null) => void;
  onInputClick: (input: ResolvedInput) => void;
  onInputDoubleClick: (input: ResolvedInput) => void;
}

function SubheaderRow({
  subheader,
  result,
  entryInputs,
  entryResults,
  outputHighlights,
  onUpdateSubheader,
  onDeleteSubheader,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  isHighlighted,
  onInputHover,
  onInputClick,
  onInputDoubleClick,
}: SubheaderRowProps) {
  const outputColor = result
    ? DATA_TYPE_COLORS[result.dataType]?.border || '#6b7280'
    : '#6b7280';

  const resultDisplay = result
    ? formatValue(result.value, result.dataType, { precision: 2 })
    : '—';

  const isSubheaderHighlighted = outputHighlights[`subheader-${subheader.id}`] ?? false;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* Subheader header row with output handle */}
      <div className={`relative ${isSubheaderHighlighted ? 'bg-blue-100 ring-1 ring-blue-400 animate-pulse' : ''}`}>
        {/* Output handle overlay — absolutely positioned for edge alignment */}
        <NodeEntry
          id={`subheader-${subheader.id}`}
          handleType="source"
          handlePosition={Position.Right}
          handleColor={outputColor}
          className="!absolute !inset-0 !min-h-0 !px-0 pointer-events-none"
        >
          <span className="sr-only">Subheader Output</span>
        </NodeEntry>

        {/* Subheader content row */}
        <div className={`flex items-center gap-1 py-1.5 px-3 ${isSubheaderHighlighted ? '' : 'bg-gray-50'}`}>
        {/* Collapse toggle */}
        <button
          onClick={() => onUpdateSubheader({ collapsed: !subheader.collapsed })}
          className="p-0.5 hover:bg-gray-200 rounded text-gray-500"
          title={subheader.collapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${subheader.collapsed ? '' : 'rotate-90'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Editable label */}
        <EditableLabel
          value={subheader.label}
          onSave={(newLabel) => onUpdateSubheader({ label: newLabel })}
          className="text-sm font-medium text-gray-800"
        />

        {/* Operation selector */}
        <OperationSelect
          value={subheader.operation}
          onChange={(op) => onUpdateSubheader({ operation: op })}
          variant="compact"
          className="w-16"
        />

        {/* Entry count */}
        <span className="text-xs text-gray-400">
          ({subheader.entries.length})
        </span>

        {/* Result */}
        <span className="font-mono text-sm font-medium text-gray-800 min-w-[60px] text-right">
          {resultDisplay}
        </span>

        {/* Delete button */}
        <button
          onClick={onDeleteSubheader}
          className="p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
          title="Delete group"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        </div>
      </div>

      {/* Entries (hidden when collapsed) */}
      {!subheader.collapsed && (
        <div>
          {subheader.entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              subheaderId={subheader.id}
              inputs={entryInputs[entry.id] || []}
              result={entryResults[`${subheader.id}-${entry.id}`] || null}
              isOutputHighlighted={outputHighlights[`entry-out-${subheader.id}-${entry.id}`] ?? false}
              onUpdateEntry={onUpdateEntry}
              onDeleteEntry={onDeleteEntry}
              isHighlighted={isHighlighted}
              onInputHover={onInputHover}
              onInputClick={onInputClick}
              onInputDoubleClick={onInputDoubleClick}
            />
          ))}

          {/* Add entry button */}
          <button
            onClick={onAddEntry}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-gray-50
                       transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Entry
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SHEET NODE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SheetNode({ id, data, selected }: NodeProps<SheetNodeType>) {
  const edges = useEdges();
  const nodes = useNodes();
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const nodeOutputs = useNodeOutputs(id);
  const { fitView } = useReactFlow();

  const { isHighlighted, handleInputHover, handleInputClick } = useHighlighting();

  const handleInputDoubleClick = useCallback((input: ResolvedInput) => {
    fitView({ nodes: [{ id: input.sourceNodeId }], duration: 300, padding: 0.5 });
  }, [fitView]);

  // Output highlight state - responds when this node's outputs are highlighted
  const outputHighlights = useNodeHighlights(id, data);

  // ─────────────────────────────────────────────────────────────────────────────
  // INPUT RESOLUTION
  // ─────────────────────────────────────────────────────────────────────────────

  // Resolve all inputs for all entries
  const { entryInputs, entryResults, subheaderResults } = useMemo(() => {
    const entryInputs: Record<string, ResolvedInput[]> = {};
    const entryResults: Record<string, SheetComputedResult | null> = {};
    const subheaderResults: Record<string, SheetComputedResult | null> = {};

    for (const subheader of data.subheaders) {
      const entryOutputs: { value: number | string | Date; dataType: SimpleDataType }[] = [];

      for (const entry of subheader.entries) {
        const handleId = `entry-in-${subheader.id}-${entry.id}`;
        const resultKey = `${subheader.id}-${entry.id}`;

        // Find edges connected to this entry's input handle
        const connectedEdges = edges.filter(
          (edge) => edge.target === id && edge.targetHandle === handleId
        );

        // Resolve inputs
        const inputs: ResolvedInput[] = [];
        for (const edge of connectedEdges) {
          const sourceNode = nodes.find((n) => n.id === edge.source) as LynkNode | undefined;
          if (!sourceNode) continue;

          const resolved = resolveNodeOutput(sourceNode, edge.sourceHandle);
          if (resolved) {
            inputs.push({ ...resolved, edgeId: edge.id });
          }
        }

        entryInputs[entry.id] = inputs;

        // Calculate entry result
        const operation = getOperation(entry.operation);
        if (operation && inputs.length >= (operation.minInputs ?? 1) && (operation.maxInputs == null || inputs.length <= operation.maxInputs)) {
          const calcResult = operation.calculate(
            inputs.map((inp) => ({
              value: inp.value,
              dataType: inp.dataType,
              label: inp.label,
              sourceNodeId: inp.sourceNodeId,
              sourceRegionId: inp.sourceRegionId,
              edgeId: inp.edgeId,
            })),
            2
          );
          if (calcResult) {
            entryResults[resultKey] = {
              value: calcResult.value,
              dataType: calcResult.dataType,
            };
            entryOutputs.push({
              value: calcResult.value,
              dataType: calcResult.dataType,
            });
          } else {
            entryResults[resultKey] = null;
          }
        } else {
          entryResults[resultKey] = null;
        }
      }

      // Calculate subheader result (aggregate of all entry outputs)
      const subheaderOp = getOperation(subheader.operation);
      if (subheaderOp && entryOutputs.length >= (subheaderOp.minInputs ?? 1) && (subheaderOp.maxInputs == null || entryOutputs.length <= subheaderOp.maxInputs)) {
        const subheaderCalcResult = subheaderOp.calculate(
          entryOutputs.map((out, idx) => ({
            value: out.value,
            dataType: out.dataType,
            label: `Entry ${idx + 1}`,
            sourceNodeId: id,
            sourceRegionId: `entry-${idx}`,
            edgeId: `virtual-${idx}`,
          })),
          2
        );
        if (subheaderCalcResult) {
          subheaderResults[subheader.id] = {
            value: subheaderCalcResult.value,
            dataType: subheaderCalcResult.dataType,
          };
        } else {
          subheaderResults[subheader.id] = null;
        }
      } else {
        subheaderResults[subheader.id] = null;
      }
    }

    return { entryInputs, entryResults, subheaderResults };
  }, [data.subheaders, edges, nodes, id]);

  // Build Exportable.outputs from entry/subheader results
  const outputs = useMemo(() => {
    const map: Record<string, import('../../types').NodeOutput> = {};

    for (const subheader of data.subheaders) {
      // Entry outputs
      for (const entry of subheader.entries) {
        const resultKey = `${subheader.id}-${entry.id}`;
        const result = entryResults[resultKey];
        if (result) {
          map[`entry-out-${subheader.id}-${entry.id}`] = {
            value: result.value,
            dataType: result.dataType,
            label: entry.label,
          };
        }
      }
      // Subheader outputs
      const subResult = subheaderResults[subheader.id];
      if (subResult) {
        map[`subheader-${subheader.id}`] = {
          value: subResult.value,
          dataType: subResult.dataType,
          label: subheader.label,
        };
      }
    }

    return Object.keys(map).length > 0 ? map : undefined;
  }, [data.subheaders, entryResults, subheaderResults]);

  // Sync results and outputs to node data
  useEffect(() => {
    if (!outputs || Object.keys(outputs).length === 0) {
      nodeOutputs.clearAll({ entryResults, subheaderResults });
      return;
    }

    nodeOutputs.update(outputs, { entryResults, subheaderResults });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entryResults/subheaderResults are derived from same data as outputs
  }, [outputs, nodeOutputs]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddSubheader = useCallback(() => {
    const newSubheader: SheetSubheader = {
      id: generateId(),
      label: 'New Group',
      operation: 'sum',
      entries: [],
      collapsed: false,
    };
    updateNodeData(id, {
      subheaders: [...data.subheaders, newSubheader],
    });
  }, [id, data.subheaders, updateNodeData]);

  const handleUpdateSubheader = useCallback(
    (subheaderId: string, updates: Partial<SheetSubheader>) => {
      updateNodeData(id, {
        subheaders: data.subheaders.map((s) =>
          s.id === subheaderId ? { ...s, ...updates } : s
        ),
      });
    },
    [id, data.subheaders, updateNodeData]
  );

  const handleDeleteSubheader = useCallback(
    (subheaderId: string) => {
      updateNodeData(id, {
        subheaders: data.subheaders.filter((s) => s.id !== subheaderId),
      });
    },
    [id, data.subheaders, updateNodeData]
  );

  const handleAddEntry = useCallback(
    (subheaderId: string) => {
      const newEntry: SheetEntry = {
        id: generateId(),
        label: 'New Entry',
        operation: 'sum',
        expanded: false,
      };
      updateNodeData(id, {
        subheaders: data.subheaders.map((s) =>
          s.id === subheaderId
            ? { ...s, entries: [...s.entries, newEntry] }
            : s
        ),
      });
    },
    [id, data.subheaders, updateNodeData]
  );

  const handleUpdateEntry = useCallback(
    (subheaderId: string, entryId: string, updates: Partial<SheetEntry>) => {
      updateNodeData(id, {
        subheaders: data.subheaders.map((s) =>
          s.id === subheaderId
            ? {
                ...s,
                entries: s.entries.map((e) =>
                  e.id === entryId ? { ...e, ...updates } : e
                ),
              }
            : s
        ),
      });
    },
    [id, data.subheaders, updateNodeData]
  );

  const handleDeleteEntry = useCallback(
    (subheaderId: string, entryId: string) => {
      updateNodeData(id, {
        subheaders: data.subheaders.map((s) =>
          s.id === subheaderId
            ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) }
            : s
        ),
      });
    },
    [id, data.subheaders, updateNodeData]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <BaseNode label={data.label} selected={selected} className="min-w-[280px]">
      <div>
        {data.subheaders.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">
            No groups yet.
            <br />
            <span className="text-xs">Click "Add Group" to create one.</span>
          </div>
        ) : (
          data.subheaders.map((subheader) => (
            <SubheaderRow
              key={subheader.id}
              subheader={subheader}
              result={subheaderResults[subheader.id] || null}
              entryInputs={entryInputs}
              entryResults={entryResults}
              outputHighlights={outputHighlights}
              onUpdateSubheader={(updates) => handleUpdateSubheader(subheader.id, updates)}
              onDeleteSubheader={() => handleDeleteSubheader(subheader.id)}
              onAddEntry={() => handleAddEntry(subheader.id)}
              onUpdateEntry={(entryId, updates) => handleUpdateEntry(subheader.id, entryId, updates)}
              onDeleteEntry={(entryId) => handleDeleteEntry(subheader.id, entryId)}
              isHighlighted={isHighlighted}
              onInputHover={handleInputHover}
              onInputClick={handleInputClick}
              onInputDoubleClick={handleInputDoubleClick}
            />
          ))
        )}
      </div>

      {/* Add Group button */}
      <button
        onClick={handleAddSubheader}
        className="w-full py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50
                   transition-colors flex items-center justify-center gap-1.5 border-t border-gray-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Group
      </button>
    </BaseNode>
  );
}

