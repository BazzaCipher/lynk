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

import { useMemo, useEffect, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position, useEdges, useReactFlow } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useCanvasStore } from '../../store/canvasStore';
import { useHighlighting, useNodeHighlights } from '../../hooks/useHighlighting';
import { useDataFlow, type ResolvedInput } from '../../hooks/useDataFlow';
import { useNodeOutputs } from '../../hooks/useNodeOutputs';
import { EditableLabel } from './base/EditableLabel';
import { getOperation, isTypeCompatible } from '../../core/operations/operationRegistry';
import { OperationSelect } from '../ui/OperationSelect';
import { getInputHandleColor, getOutputHandleColor } from '../../utils/colors';
import { formatValue } from '../../utils/formatting';
import { InputRow } from './base/InputRow';
import type {
  CalculationNode as CalculationNodeType,
  CalculationResult,
  SimpleDataType,
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CalculationNode({ id, data, selected }: NodeProps<CalculationNodeType>) {
  const edges = useEdges();
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const removeEdge = useCanvasStore((state) => state.removeEdge);
  const nodeOutputs = useNodeOutputs(id);
  const { fitView } = useReactFlow();

  // Use highlighting hook with input handlers
  const { isHighlighted, handleInputHover, handleInputClick } = useHighlighting();

  // Output highlight state - responds when this node's output is highlighted
  const outputHighlights = useNodeHighlights(id, data);
  const isOutputHighlighted = outputHighlights['output'] ?? false;

  const currentOperation = getOperation(data.operation);

  // Store accepted types in node data for handle coloring
  useEffect(() => {
    const types = currentOperation?.compatibleTypes ?? [];
    const currentTypes = data.acceptedTypes;
    // Only update if types changed
    if (JSON.stringify(types) !== JSON.stringify(currentTypes)) {
      updateNodeData(id, { acceptedTypes: types });
    }
  }, [currentOperation, id, updateNodeData, data.acceptedTypes]);

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
    if (currentOperation.maxInputs != null && compatibleInputs.length > currentOperation.maxInputs) return null;

    const operationResult = currentOperation.calculate(compatibleInputs, data.precision ?? 2);
    if (!operationResult) return null;

    return {
      value: operationResult.value,
      dataType: operationResult.dataType,
    };
  }, [compatibleInputs, currentOperation, data.precision]);

  // Sync result and outputs to node data
  useEffect(() => {
    if (!result) {
      nodeOutputs.clearAll({ result: undefined });
      return;
    }

    // Determine compatible types for output handle coloring
    const compatibleTypes = (currentOperation?.compatibleTypes.includes('number')
      && currentOperation?.compatibleTypes.includes('currency'))
      ? ['number', 'currency'] as SimpleDataType[]
      : undefined;

    nodeOutputs.set('output', {
      value: result.value,
      dataType: result.dataType,
      compatibleTypes,
      label: data.label,
      source: result.source ?? null,
    }, { result });
  }, [result, data.label, currentOperation, nodeOutputs]);

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
  // VALUE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────────

  const displayValue = useCallback((value: number | string | boolean | Date, dataType: SimpleDataType): string => {
    // Handle actual boolean values (from operation results)
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return formatValue(value, dataType, { precision: data.precision ?? 2 });
  }, [data.precision]);

  const handleInputDoubleClick = useCallback((input: ResolvedInput) => {
    fitView({ nodes: [{ id: input.sourceNodeId }], duration: 300, padding: 0.5 });
  }, [fitView]);

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────────────────────────────────────

  const isSingleInput = currentOperation?.category === 'single';

  // Compute handle colors using utility functions
  const inputHandleColor = getInputHandleColor(data.acceptedTypes);
  const outputHandleColor = getOutputHandleColor(data.outputs?.output);

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
          handleColor={inputHandleColor}
        >
          <div className="flex-1">
            {resolvedInputs.length === 0 ? (
              <span className="text-bridge-400 text-xs">
                {isSingleInput ? 'Connect one input...' : 'Connect inputs...'}
              </span>
            ) : (
              <div className="space-y-0.5">
                <span className="text-bridge-500 text-xs">
                  {isSingleInput
                    ? `Input (${compatibleInputs.length > 0 ? '1' : '0'} value)`
                    : `Inputs (${compatibleInputs.length} values)`}
                </span>

                {/* Compatible inputs */}
                {compatibleInputs.map((input) => (
                  <InputRow
                    key={`${input.sourceNodeId}-${input.sourceRegionId}`}
                    input={input}
                    isHighlighted={isHighlighted(input.sourceNodeId, input.sourceRegionId)}
                    onHover={handleInputHover}
                    onClick={handleInputClick}
                    onDoubleClick={handleInputDoubleClick}
                  />
                ))}

                {/* Incompatible inputs with warning */}
                {incompatibleInputs.map((input) => (
                  <InputRow
                    key={`incompatible-${input.sourceNodeId}-${input.sourceRegionId}`}
                    input={input}
                    isHighlighted={false}
                    onHover={handleInputHover}
                    onClick={handleInputClick}
                    onDoubleClick={handleInputDoubleClick}
                    isIncompatible
                    incompatibleReason={`${input.dataType} is not compatible with ${currentOperation?.label || data.operation}`}
                  />
                ))}
              </div>
            )}
          </div>
        </NodeEntry>

        {/* Operation dropdown with subheaders */}
        <div className="flex items-center gap-2 px-2 py-1 border-t border-paper-100 mt-1">
          <span className="text-bridge-500 text-xs">Op:</span>
          <OperationSelect value={data.operation} onChange={handleOperationChange} />
        </div>

        {/* Result row with editable label and output handle */}
        <NodeEntry
          id="output"
          handleType="source"
          handlePosition={Position.Right}
          handleColor={outputHandleColor}
          className={isOutputHighlighted ? 'bg-copper-400/20 ring-1 ring-copper-400 animate-pulse rounded' : ''}
        >
          <div className="flex-1 flex items-center gap-2">
            <EditableLabel
              value={data.label}
              onSave={(newLabel) => updateNodeData(id, { label: newLabel })}
              className="text-bridge-500"
            />
            {/* Result value */}
            {result ? (
              <span className="font-mono font-medium text-sm">
                {displayValue(result.value, result.dataType)}
              </span>
            ) : (
              <span className="text-bridge-400">-</span>
            )}
          </div>
        </NodeEntry>
      </div>
    </BaseNode>
  );
}
