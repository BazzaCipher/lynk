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

import { useMemo, useEffect, useCallback, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position, useEdges, useNodes } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useCanvasStore } from '../../store/canvasStore';
import { useHighlighting } from '../../hooks/useHighlighting';
import { type ResolvedInput, parseNumericValue } from '../../hooks/useDataFlow';
import { getOperation, OPERATIONS } from '../../core/operations/operationRegistry';
import { DATA_TYPE_COLORS, getTypeBadgeClass } from '../../utils/colors';
import { formatValue } from '../../utils/formatting';
import type {
  SheetNode as SheetNodeType,
  SheetSubheader,
  SheetEntry,
  SheetComputedResult,
  SimpleDataType,
  LynkNode,
  ExtractorNode,
  CalculationNode,
  DataSourceReference,
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface OperationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

function OperationSelector({ value, onChange, compact }: OperationSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs bg-gray-100 border border-gray-200 rounded px-1 py-0.5 ${
        compact ? 'w-14' : 'w-16'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {OPERATIONS.map((op) => (
        <option key={op.id} value={op.id}>
          {op.label}
        </option>
      ))}
    </select>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY INPUT ROW COMPONENT (shown when entry is expanded)
// ═══════════════════════════════════════════════════════════════════════════════

interface EntryInputRowProps {
  input: ResolvedInput;
  isHighlighted: boolean;
  onHover: (input: ResolvedInput | null) => void;
  onClick: (input: ResolvedInput) => void;
}

function EntryInputRow({ input, isHighlighted, onHover, onClick }: EntryInputRowProps) {
  const displayVal = formatValue(input.value, input.dataType, { precision: 2 });

  return (
    <div
      className={`flex items-center gap-2 pl-6 pr-2 py-0.5 text-xs cursor-pointer transition-colors ${
        isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
      onMouseEnter={() => onHover(input)}
      onMouseLeave={() => !isHighlighted && onHover(null)}
      onClick={() => onClick(input)}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${getTypeBadgeClass(input.dataType)}`}
        title={input.dataType}
      />
      <span className="text-gray-500 truncate max-w-[80px]" title={input.label}>
        {input.label}:
      </span>
      <span className="font-mono text-gray-700 ml-auto">{displayVal}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY ROW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface EntryRowProps {
  entry: SheetEntry;
  subheaderId: string;
  inputs: ResolvedInput[];
  result: SheetComputedResult | null;
  onUpdateEntry: (entryId: string, updates: Partial<SheetEntry>) => void;
  onDeleteEntry: (entryId: string) => void;
  isHighlighted: (nodeId: string, regionId: string) => boolean;
  onInputHover: (input: ResolvedInput | null) => void;
  onInputClick: (input: ResolvedInput) => void;
}

function EntryRow({
  entry,
  subheaderId,
  inputs,
  result,
  onUpdateEntry,
  onDeleteEntry,
  isHighlighted,
  onInputHover,
  onInputClick,
}: EntryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(entry.label);

  const handleLabelSave = () => {
    if (labelValue.trim()) {
      onUpdateEntry(entry.id, { label: labelValue.trim() });
    } else {
      setLabelValue(entry.label);
    }
    setIsEditing(false);
  };

  const outputColor = result
    ? DATA_TYPE_COLORS[result.dataType]?.border || '#6b7280'
    : '#6b7280';

  const resultDisplay = result
    ? formatValue(result.value, result.dataType, { precision: 2 })
    : '—';

  const inputHandleId = `entry-in-${subheaderId}-${entry.id}`;
  const outputHandleId = `entry-out-${subheaderId}-${entry.id}`;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Entry main row */}
      <div className="flex items-center gap-1 py-1 px-1">
        {/* Input handle */}
        <NodeEntry
          id={inputHandleId}
          handleType="target"
          handlePosition={Position.Left}
          allowMultiple
          className="flex-shrink-0 min-h-6 !px-0"
        >
          <span className="sr-only">Input</span>
        </NodeEntry>

        {/* Expand/collapse toggle */}
        <button
          onClick={() => onUpdateEntry(entry.id, { expanded: !entry.expanded })}
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
        {isEditing ? (
          <input
            type="text"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSave();
              if (e.key === 'Escape') {
                setLabelValue(entry.label);
                setIsEditing(false);
              }
            }}
            autoFocus
            className="flex-1 text-xs px-1 py-0.5 border border-blue-300 rounded min-w-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-xs text-gray-700 truncate cursor-pointer hover:text-blue-600"
            onDoubleClick={() => setIsEditing(true)}
            title={`${entry.label} (double-click to edit)`}
          >
            {entry.label}
          </span>
        )}

        {/* Operation selector */}
        <OperationSelector
          value={entry.operation}
          onChange={(op) => onUpdateEntry(entry.id, { operation: op })}
          compact
        />

        {/* Input count badge */}
        <span className="text-xs text-gray-400 w-5 text-center">{inputs.length}</span>

        {/* Result */}
        <span className="font-mono text-xs text-gray-800 min-w-[50px] text-right">
          {resultDisplay}
        </span>

        {/* Delete button */}
        <button
          onClick={() => onDeleteEntry(entry.id)}
          className="p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
          title="Delete entry"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Output handle */}
        <NodeEntry
          id={outputHandleId}
          handleType="source"
          handlePosition={Position.Right}
          handleColor={outputColor}
          className="flex-shrink-0 min-h-6 !px-0"
        >
          <span className="sr-only">Output</span>
        </NodeEntry>
      </div>

      {/* Expanded input list */}
      {entry.expanded && inputs.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-100">
          {inputs.map((input) => (
            <EntryInputRow
              key={input.edgeId}
              input={input}
              isHighlighted={isHighlighted(input.sourceNodeId, input.sourceRegionId)}
              onHover={onInputHover}
              onClick={onInputClick}
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
  onUpdateSubheader: (updates: Partial<SheetSubheader>) => void;
  onDeleteSubheader: () => void;
  onAddEntry: () => void;
  onUpdateEntry: (entryId: string, updates: Partial<SheetEntry>) => void;
  onDeleteEntry: (entryId: string) => void;
  isHighlighted: (nodeId: string, regionId: string) => boolean;
  onInputHover: (input: ResolvedInput | null) => void;
  onInputClick: (input: ResolvedInput) => void;
}

function SubheaderRow({
  subheader,
  result,
  entryInputs,
  entryResults,
  onUpdateSubheader,
  onDeleteSubheader,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  isHighlighted,
  onInputHover,
  onInputClick,
}: SubheaderRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(subheader.label);

  const handleLabelSave = () => {
    if (labelValue.trim()) {
      onUpdateSubheader({ label: labelValue.trim() });
    } else {
      setLabelValue(subheader.label);
    }
    setIsEditing(false);
  };

  const outputColor = result
    ? DATA_TYPE_COLORS[result.dataType]?.border || '#6b7280'
    : '#6b7280';

  const resultDisplay = result
    ? formatValue(result.value, result.dataType, { precision: 2 })
    : '—';

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* Subheader header row */}
      <div className="flex items-center gap-1 py-1.5 px-2 bg-gray-50">
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
        {isEditing ? (
          <input
            type="text"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSave();
              if (e.key === 'Escape') {
                setLabelValue(subheader.label);
                setIsEditing(false);
              }
            }}
            autoFocus
            className="flex-1 text-sm font-medium px-1 py-0.5 border border-blue-300 rounded min-w-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium text-gray-800 truncate cursor-pointer hover:text-blue-600"
            onDoubleClick={() => setIsEditing(true)}
            title={`${subheader.label} (double-click to edit)`}
          >
            {subheader.label}
          </span>
        )}

        {/* Operation selector */}
        <OperationSelector
          value={subheader.operation}
          onChange={(op) => onUpdateSubheader({ operation: op })}
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

        {/* Output handle for subheader */}
        <NodeEntry
          id={`subheader-${subheader.id}`}
          handleType="source"
          handlePosition={Position.Right}
          handleColor={outputColor}
          className="flex-shrink-0 min-h-6 !px-0"
        >
          <span className="sr-only">Subheader Output</span>
        </NodeEntry>
      </div>

      {/* Entries (hidden when collapsed) */}
      {!subheader.collapsed && (
        <div className="pl-4">
          {subheader.entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              subheaderId={subheader.id}
              inputs={entryInputs[entry.id] || []}
              result={entryResults[`${subheader.id}-${entry.id}`] || null}
              onUpdateEntry={onUpdateEntry}
              onDeleteEntry={onDeleteEntry}
              isHighlighted={isHighlighted}
              onInputHover={onInputHover}
              onInputClick={onInputClick}
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

  const { isHighlighted, setHighlight, clearHighlight, toggleHighlight } = useHighlighting();

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

          const resolved = resolveNodeOutputLocal(sourceNode, edge.sourceHandle);
          if (resolved) {
            inputs.push({ ...resolved, edgeId: edge.id });
          }
        }

        entryInputs[entry.id] = inputs;

        // Calculate entry result
        const operation = getOperation(entry.operation);
        if (operation && inputs.length >= (operation.minInputs ?? 1)) {
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
      if (subheaderOp && entryOutputs.length >= (subheaderOp.minInputs ?? 1)) {
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

  // Store results in node data for downstream nodes to access
  useEffect(() => {
    const currentEntryResults = JSON.stringify(data.entryResults);
    const newEntryResults = JSON.stringify(entryResults);
    const currentSubheaderResults = JSON.stringify(data.subheaderResults);
    const newSubheaderResults = JSON.stringify(subheaderResults);

    if (currentEntryResults !== newEntryResults || currentSubheaderResults !== newSubheaderResults) {
      updateNodeData(id, { entryResults, subheaderResults });
    }
  }, [entryResults, subheaderResults, id, updateNodeData, data.entryResults, data.subheaderResults]);

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
  // HIGHLIGHTING HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleInputHover = useCallback(
    (input: ResolvedInput | null) => {
      if (input) {
        setHighlight(input.sourceNodeId, input.sourceRegionId);
      } else {
        clearHighlight();
      }
    },
    [setHighlight, clearHighlight]
  );

  const handleInputClick = useCallback(
    (input: ResolvedInput) => {
      toggleHighlight(input.sourceNodeId, input.sourceRegionId);
    },
    [toggleHighlight]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <BaseNode label={data.label} selected={selected} className="min-w-[280px]">
      <div className="max-h-[400px] overflow-auto">
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
              onUpdateSubheader={(updates) => handleUpdateSubheader(subheader.id, updates)}
              onDeleteSubheader={() => handleDeleteSubheader(subheader.id)}
              onAddEntry={() => handleAddEntry(subheader.id)}
              onUpdateEntry={(entryId, updates) => handleUpdateEntry(subheader.id, entryId, updates)}
              onDeleteEntry={(entryId) => handleDeleteEntry(subheader.id, entryId)}
              isHighlighted={isHighlighted}
              onInputHover={handleInputHover}
              onInputClick={handleInputClick}
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

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL RESOLVER (duplicated to avoid circular imports)
// ═══════════════════════════════════════════════════════════════════════════════

function resolveNodeOutputLocal(
  node: LynkNode,
  sourceHandle: string | null | undefined
): Omit<ResolvedInput, 'edgeId'> | null {
  if (!sourceHandle) return null;

  if (node.type === 'extractor') {
    const extractorNode = node as ExtractorNode;
    const region = extractorNode.data.regions.find((r) => r.id === sourceHandle);
    if (!region) return null;

    const extractedValue = region.extractedData.value;
    let value: string | number | boolean | Date;
    let numericValue: number | null = null;

    if (region.dataType === 'boolean') {
      if (typeof extractedValue === 'boolean') {
        value = extractedValue;
      } else {
        const strVal = String(extractedValue).toLowerCase();
        value = strVal === 'yes' || strVal === 'true' || strVal === '1';
      }
    } else if (region.dataType === 'date') {
      value = typeof extractedValue === 'string' ? extractedValue : String(extractedValue);
    } else if (typeof extractedValue === 'number') {
      value = extractedValue;
      numericValue = extractedValue;
    } else if (typeof extractedValue === 'string') {
      value = extractedValue;
      numericValue = parseNumericValue(extractedValue);
    } else {
      value = String(extractedValue);
    }

    const source: DataSourceReference = {
      nodeId: node.id,
      regionId: region.id,
      pageNumber: region.pageNumber,
      coordinates: region.coordinates,
      textRange: region.textRange,
      extractionMethod: region.extractedData.source?.extractionMethod || 'manual',
      confidence: region.extractedData.source?.confidence,
    };

    return {
      value,
      numericValue,
      label: region.label,
      source,
      dataType: region.dataType,
      sourceNodeId: node.id,
      sourceRegionId: region.id,
    };
  }

  if (node.type === 'calculation') {
    if (sourceHandle !== 'output') return null;
    const calcNode = node as CalculationNode;
    const result = calcNode.data.result;
    if (!result) return null;

    const value = result.value;
    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? parseNumericValue(value)
          : null;

    return {
      value,
      numericValue,
      label: calcNode.data.label,
      source: result.source || null,
      dataType: result.dataType,
      sourceNodeId: node.id,
      sourceRegionId: 'output',
    };
  }

  // Handle sheet node outputs (for chaining sheets)
  if (node.type === 'sheet') {
    const sheetNode = node as SheetNodeType;

    if (sourceHandle.startsWith('entry-out-')) {
      const parts = sourceHandle.replace('entry-out-', '').split('-');
      const subheaderId = parts[0];
      const entryId = parts.slice(1).join('-');

      const subheader = sheetNode.data.subheaders.find((s) => s.id === subheaderId);
      const entry = subheader?.entries.find((e) => e.id === entryId);
      if (!entry) return null;

      const result = sheetNode.data.entryResults?.[`${subheaderId}-${entryId}`];
      if (!result) return null;

      const numericValue =
        typeof result.value === 'number'
          ? result.value
          : typeof result.value === 'string'
            ? parseNumericValue(result.value)
            : null;

      return {
        value: result.value,
        numericValue,
        label: entry.label,
        source: null,
        dataType: result.dataType,
        sourceNodeId: node.id,
        sourceRegionId: `${subheaderId}-${entryId}`,
      };
    }

    if (sourceHandle.startsWith('subheader-')) {
      const subheaderId = sourceHandle.replace('subheader-', '');
      const subheader = sheetNode.data.subheaders.find((s) => s.id === subheaderId);
      if (!subheader) return null;

      const result = sheetNode.data.subheaderResults?.[subheaderId];
      if (!result) return null;

      const numericValue =
        typeof result.value === 'number'
          ? result.value
          : typeof result.value === 'string'
            ? parseNumericValue(result.value)
            : null;

      return {
        value: result.value,
        numericValue,
        label: subheader.label,
        source: null,
        dataType: result.dataType,
        sourceNodeId: node.id,
        sourceRegionId: subheaderId,
      };
    }
  }

  return null;
}
