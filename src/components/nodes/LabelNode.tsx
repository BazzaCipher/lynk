import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useDataFlow, formatValue } from '../../hooks/useDataFlow';
import { useSourceHighlighting } from '../../hooks/useHighlighting';
import { useCanvasStore } from '../../store/canvasStore';
import { EditableLabel } from './base/EditableLabel';
import { useNodeOutputs } from '../../hooks/useNodeOutputs';
import { getInputHandleColor, getOutputHandleColor } from '../../utils/colors';
import type { LabelNode as LabelNodeType, SimpleDataType } from '../../types';

export function LabelNode({ id, data, selected }: NodeProps<LabelNodeType>) {
  const { inputs, hasInputs } = useDataFlow({ nodeId: id, targetHandle: 'input' });
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const removeEdgesToTarget = useCanvasStore((state) => state.removeEdgesToTarget);
  const nodeOutputs = useNodeOutputs(id);

  // Local editing state for value
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // All data types for LabelNode input (accepts everything)
  const allTypes: SimpleDataType[] = useMemo(
    () => ['string', 'number', 'currency', 'date', 'boolean'],
    []
  );

  // Store accepted types in node data for handle coloring
  useEffect(() => {
    const currentTypes = data.acceptedTypes;
    if (JSON.stringify(allTypes) !== JSON.stringify(currentTypes)) {
      updateNodeData(id, { acceptedTypes: allTypes });
    }
  }, [id, updateNodeData, data.acceptedTypes, allTypes]);

  // Get the first (and only) input value
  const input = inputs[0];

  // Use highlighting hook for the input source
  const { isHighlighted, onMouseEnter, onMouseLeave, onClick } = useSourceHighlighting(input?.source ?? null);

  // Determine if we're in manual mode
  const isManualMode = data.isManualMode || (!hasInputs && data.manualValue !== undefined);

  // Resolve display value - connected value takes priority unless in manual mode
  const displayValue = useMemo(() => {
    // If we have a connected input and not in manual mode, use it
    if (hasInputs && input && !data.isManualMode) {
      const value = input.numericValue ?? input.value;
      return formatValue(value, data.format);
    }

    // Otherwise use manual value if available
    if (data.manualValue !== undefined && data.manualValue !== '') {
      return data.manualValue;
    }

    return null;
  }, [input, hasInputs, data.format, data.isManualMode, data.manualValue]);

  // Output value for the source handle - same as display value
  const outputValue = useMemo(() => {
    if (hasInputs && input && !data.isManualMode) {
      return input.numericValue ?? input.value;
    }
    if (data.manualValue !== undefined && data.manualValue !== '') {
      // Try to parse as number for format compatibility
      const num = parseFloat(data.manualValue);
      return isNaN(num) ? data.manualValue : num;
    }
    return null;
  }, [input, hasInputs, data.isManualMode, data.manualValue]);

  const fontSizeClass = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-2xl',
  }[data.fontSize];

  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[data.alignment];

  // Handle double-click to enter edit mode
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(data.manualValue ?? displayValue?.toString() ?? '');
    setIsEditing(true);
  }, [data.manualValue, displayValue]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle save
  const handleSave = useCallback(() => {
    // If we had incoming edges, disconnect them when entering manual mode
    if (hasInputs) {
      removeEdgesToTarget(id, 'input');
    }

    updateNodeData(id, {
      manualValue: editValue,
      isManualMode: true,
    });
    setIsEditing(false);
  }, [id, editValue, hasInputs, updateNodeData, removeEdgesToTarget]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Handle key events for value editing
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
    e.stopPropagation();
  }, [handleSave, handleCancel]);

  // Hydrate outputs from persisted value on mount (before upstream data is available)
  useEffect(() => {
    if (data.value && !data.outputs) {
      const dataType: 'number' | 'string' = data.value.type === 'number' ? 'number' : 'string';
      updateNodeData(id, {
        outputs: {
          output: {
            value: data.value.value,
            dataType,
            label: data.label,
          },
        },
      });
    }
    // Only run on mount - don't include data.value or data.outputs as deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync value and outputs to node data
  useEffect(() => {
    if (outputValue === null || outputValue === undefined) {
      nodeOutputs.clearAll({ value: undefined });
      return;
    }

    const dataType: 'number' | 'string' = typeof outputValue === 'number' ? 'number' : 'string';
    // Determine compatible types based on format
    const compatibleTypes = (data.format === 'number' || data.format === 'currency')
      ? ['number', 'currency'] as SimpleDataType[]
      : undefined;

    nodeOutputs.set('output', {
      value: outputValue,
      dataType,
      compatibleTypes,
      label: data.label,
    }, { value: { type: dataType, value: outputValue } });
  }, [outputValue, data.label, data.format, nodeOutputs]);

  return (
    <BaseNode
      label={data.label}
      selected={selected}
      className="!min-w-0"
      renderHeader={
        <EditableLabel
          value={data.label}
          onSave={(newLabel) => updateNodeData(id, { label: newLabel })}
          variant="header"
        />
      }
    >
      <div className="relative">
        {/* Input handle (left) - accepts all types */}
        <NodeEntry
          id="input"
          handleType="target"
          handlePosition={Position.Left}
          handleColor={getInputHandleColor(data.acceptedTypes)}
        >
          <div className="w-0" />
        </NodeEntry>

        {/* Value display/edit area - compact */}
        <div className="px-1.5 py-0.5">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className={`${fontSizeClass} ${alignmentClass} font-mono w-full px-1 py-0.5 border border-blue-400 rounded outline-none bg-blue-50`}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className={`${fontSizeClass} ${alignmentClass} font-mono min-h-[1.5em] flex-1 px-1 py-0.5 rounded transition-colors cursor-text ${
                hasInputs && input?.source && !data.isManualMode
                  ? 'hover:bg-gray-100'
                  : 'hover:bg-blue-50'
              } ${isHighlighted ? 'bg-blue-100 ring-1 ring-blue-400' : ''}`}
              onMouseEnter={!data.isManualMode ? onMouseEnter : undefined}
              onMouseLeave={!data.isManualMode ? onMouseLeave : undefined}
              onClick={!data.isManualMode ? onClick : undefined}
              onDoubleClick={handleDoubleClick}
            >
              {displayValue ?? (
                <span className="text-gray-400 text-xs">Double-click...</span>
              )}
            </div>
          )}
        </div>

        {/* Output handle (right) - color based on format */}
        <NodeEntry
          id="output"
          handleType="source"
          handlePosition={Position.Right}
          handleColor={getOutputHandleColor(data.outputs?.output)}
        >
          <div className="w-0" />
        </NodeEntry>
      </div>

      {/* Compact footer - format + source indicator */}
      <div className="px-1.5 py-0.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
        <span className="capitalize">{data.format}</span>
        {isManualMode ? (
          <span className="text-blue-500">manual</span>
        ) : input?.label ? (
          <span className="truncate max-w-[80px]" title={input.label}>
            ← {input.label}
          </span>
        ) : null}
      </div>
    </BaseNode>
  );
}
