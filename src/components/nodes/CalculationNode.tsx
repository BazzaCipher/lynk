/**
 * CalculationNode Component
 *
 * A node that performs mathematical operations on connected inputs.
 * Uses the operation registry for extensible operation support.
 *
 * Features:
 * - Dropdown with categorized operations (Multiple/Single inputs)
 * - Type-based input validation
 * - Automatic disconnection of incompatible inputs when switching operations
 * - Input caching for UX when switching between operations
 * - Output handle color reflects result data type
 */

import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position, useEdges } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useCanvasStore } from '../../store/canvasStore';
import { useHighlighting } from '../../hooks/useHighlighting';
import { useDataFlow, type ResolvedInput } from '../../hooks/useDataFlow';
import {
  getOperation,
  getOperationsByCategory,
  isTypeCompatible,
  CATEGORY_LABELS,
} from '../../core/operations/operationRegistry';
import { DATA_TYPE_COLORS } from '../../utils/colors';
import { formatValue } from '../../utils/formatting';
import type {
  CalculationNode as CalculationNodeType,
  CalculationResult,
  SimpleDataType,
} from '../../types';

// ResolvedInput type imported from useDataFlow

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION DROPDOWN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface OperationDropdownProps {
  currentOperation: string;
  onSelect: (operationId: string) => void;
  disabled?: boolean;
}

/**
 * Dropdown component for selecting operations with category subheaders.
 * Groups operations into "Multiple Inputs" and "Single Input" sections.
 */
function OperationDropdown({ currentOperation, onSelect, disabled }: OperationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const operationsByCategory = getOperationsByCategory();
  const current = getOperation(currentOperation);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-2 py-1 text-xs font-medium bg-gray-100
                   hover:bg-gray-200 rounded transition-colors disabled:opacity-50
                   min-w-[70px] justify-between"
      >
        <span>{current?.label || currentOperation}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg shadow-lg
                      border border-gray-200 z-50 overflow-hidden"
        >
          {Object.entries(operationsByCategory).map(([category, ops]) => (
            <div key={category}>
              {/* Category subheader */}
              <div
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50
                            border-b border-gray-100 uppercase tracking-wide"
              >
                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
              </div>
              {/* Operations in this category */}
              {ops.map((op) => (
                <button
                  key={op.id}
                  onClick={() => {
                    onSelect(op.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50
                              transition-colors flex items-center justify-between
                              ${op.id === currentOperation ? 'bg-blue-100 text-blue-700' : ''}`}
                  title={op.description}
                >
                  <span>{op.label}</span>
                  {op.id === currentOperation && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CalculationNode({ id, data, selected }: NodeProps<CalculationNodeType>) {
  const edges = useEdges();
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const removeEdge = useCanvasStore((state) => state.removeEdge);

  // Use highlighting hook
  const { isHighlighted, setHighlight, clearHighlight, toggleHighlight } = useHighlighting();

  const currentOperation = getOperation(data.operation);

  // ─────────────────────────────────────────────────────────────────────────────
  // INPUT RESOLUTION (using shared useDataFlow hook)
  // ─────────────────────────────────────────────────────────────────────────────

  // Use the shared data flow hook - don't filter by type here so we can show warnings
  const { inputs: resolvedInputs } = useDataFlow({ nodeId: id, targetHandle: 'inputs' });

  // Find all edges connected to this node's inputs handle (for operation change handling)
  const connectedEdges = useMemo(() => {
    return edges.filter((edge) => edge.target === id && edge.targetHandle === 'inputs');
  }, [edges, id]);

  // ─────────────────────────────────────────────────────────────────────────────
  // INPUT FILTERING BY TYPE COMPATIBILITY
  // ─────────────────────────────────────────────────────────────────────────────

  /** Inputs that are compatible with the current operation */
  const compatibleInputs = useMemo(() => {
    if (!currentOperation) return resolvedInputs;
    return resolvedInputs.filter((input) => isTypeCompatible(data.operation, input.dataType));
  }, [resolvedInputs, currentOperation, data.operation]);

  /** Inputs that are NOT compatible (shown with warning) */
  const incompatibleInputs = useMemo(() => {
    if (!currentOperation) return [];
    return resolvedInputs.filter((input) => !isTypeCompatible(data.operation, input.dataType));
  }, [resolvedInputs, currentOperation, data.operation]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CALCULATION
  // ─────────────────────────────────────────────────────────────────────────────

  /** Calculate result using operation registry */
  const result = useMemo((): CalculationResult | null => {
    if (!currentOperation) return null;
    if (compatibleInputs.length < (currentOperation.minInputs ?? 1)) return null;

    const operationResult = currentOperation.calculate(compatibleInputs, data.precision ?? 2);
    if (!operationResult) return null;

    return {
      value: operationResult.value,
      dataType: operationResult.dataType,
    };
  }, [compatibleInputs, currentOperation, data.precision]);

  // Store result and outputs in node data for downstream nodes to access
  useEffect(() => {
    const currentValue = data.result?.value;
    const newValue = result?.value;
    const currentType = data.result?.dataType;
    const newType = result?.dataType;

    if (currentValue !== newValue || currentType !== newType) {
      const outputs = result
        ? {
            output: {
              value: result.value,
              dataType: result.dataType,
              label: data.label,
              source: result.source ?? null,
            },
          }
        : undefined;
      updateNodeData(id, { result, outputs });
    }
  }, [result, id, updateNodeData, data.result?.value, data.result?.dataType, data.label]);

  // ─────────────────────────────────────────────────────────────────────────────
  // OPERATION CHANGE HANDLING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handle operation change with input caching and type-based disconnection.
   *
   * When switching operations:
   * 1. Cache current edges for the old operation
   * 2. Disconnect incompatible inputs for the new operation
   * 3. For single-input ops, keep only first compatible input
   */
  const handleOperationChange = useCallback(
    (newOperationId: string) => {
      const newOperation = getOperation(newOperationId);
      if (!newOperation || newOperationId === data.operation) return;

      // 1. Cache current inputs for the old operation
      const currentEdgeIds = connectedEdges.map((e) => e.id);
      const inputCache = { ...(data.inputCache || {}) };

      if (currentEdgeIds.length > 0) {
        inputCache[data.operation] = {
          operationId: data.operation,
          edgeIds: currentEdgeIds,
          cachedAt: new Date().toISOString(),
        };
      }

      // 2. Identify inputs to disconnect (incompatible with new operation)
      const edgesToRemove: string[] = [];
      let compatibleCount = 0;

      for (const input of resolvedInputs) {
        const isCompatible = newOperation.compatibleTypes.includes(input.dataType);
        if (!isCompatible) {
          edgesToRemove.push(input.edgeId);
        } else {
          compatibleCount++;
          // 3. For single-input operations, keep only the first compatible input
          if (newOperation.maxInputs === 1 && compatibleCount > 1) {
            edgesToRemove.push(input.edgeId);
          }
        }
      }

      // Remove incompatible/excess edges
      edgesToRemove.forEach((edgeId) => removeEdge(edgeId));

      // 4. Update node data with new operation and cache
      updateNodeData(id, {
        operation: newOperationId,
        inputCache,
      });
    },
    [id, data.operation, data.inputCache, connectedEdges, resolvedInputs, updateNodeData, removeEdge]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // HIGHLIGHTING HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleInputHover = useCallback((input: ResolvedInput | null) => {
    if (input) {
      setHighlight(input.sourceNodeId, input.sourceRegionId);
    } else {
      clearHighlight();
    }
  }, [setHighlight, clearHighlight]);

  const handleInputClick = useCallback((input: ResolvedInput) => {
    toggleHighlight(input.sourceNodeId, input.sourceRegionId);
  }, [toggleHighlight]);

  // ─────────────────────────────────────────────────────────────────────────────
  // VALUE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────────

  const displayValue = useCallback((value: number | string | boolean | Date, dataType: SimpleDataType): string => {
    // Handle actual boolean values (from operation results)
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return formatValue(value, dataType, { precision: data.precision ?? 2 });
  }, [data.precision]);

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────────────────────────────────────

  const isSingleInput = currentOperation?.category === 'single';
  const outputColor = result
    ? DATA_TYPE_COLORS[result.dataType]?.border || '#6b7280'
    : '#6b7280';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <BaseNode label={data.label} selected={selected}>
      <div className="text-sm min-w-[180px]">
        {/* Input handle - behavior varies based on operation category */}
        <NodeEntry
          id="inputs"
          handleType="target"
          handlePosition={Position.Left}
          allowMultiple={!isSingleInput}
        >
          <div className="flex-1">
            {resolvedInputs.length === 0 ? (
              <span className="text-gray-400 text-xs">
                {isSingleInput ? 'Connect one input...' : 'Connect inputs...'}
              </span>
            ) : (
              <div className="space-y-0.5">
                <span className="text-gray-500 text-xs">
                  {isSingleInput
                    ? `Input (${compatibleInputs.length > 0 ? '1' : '0'} value)`
                    : `Inputs (${compatibleInputs.length} values)`}
                </span>

                {/* Compatible inputs */}
                {compatibleInputs.map((input) => {
                  const inputHighlighted = isHighlighted(input.sourceNodeId, input.sourceRegionId);

                  return (
                    <div
                      key={`${input.sourceNodeId}-${input.sourceRegionId}`}
                      className={`flex items-center gap-2 px-1.5 py-0.5 rounded text-xs
                                  cursor-pointer transition-colors ${
                                    inputHighlighted
                                      ? 'bg-blue-100 ring-1 ring-blue-400'
                                      : 'hover:bg-gray-100'
                                  }`}
                      onMouseEnter={() => handleInputHover(input)}
                      onMouseLeave={() => {
                        if (!inputHighlighted) handleInputHover(null);
                      }}
                      onClick={() => handleInputClick(input)}
                    >
                      <span className="text-gray-500 truncate max-w-[80px]" title={input.label}>
                        {input.label}:
                      </span>
                      <span className="font-mono text-gray-700">
                        {displayValue(input.value, input.dataType)}
                      </span>
                    </div>
                  );
                })}

                {/* Incompatible inputs with warning */}
                {incompatibleInputs.map((input) => (
                  <div
                    key={`incompatible-${input.sourceNodeId}-${input.sourceRegionId}`}
                    className="flex items-center gap-2 px-1.5 py-0.5 rounded text-xs
                               bg-red-50 text-red-600"
                    title={`${input.dataType} is not compatible with ${currentOperation?.label || data.operation}`}
                  >
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="truncate">{input.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </NodeEntry>

        {/* Operation dropdown with subheaders */}
        <div className="flex items-center gap-2 px-2 py-1 border-t border-gray-100 mt-1">
          <span className="text-gray-500 text-xs">Op:</span>
          <OperationDropdown currentOperation={data.operation} onSelect={handleOperationChange} />
        </div>

        {/* Result with output handle (color reflects result type) */}
        <NodeEntry
          id="output"
          handleType="source"
          handlePosition={Position.Right}
          handleColor={outputColor}
        >
          <div className="flex-1 text-right">
            {result ? (
              <span className="font-mono font-medium text-sm">
                {displayValue(result.value, result.dataType)}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </NodeEntry>
      </div>
    </BaseNode>
  );
}
