import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useDataFlow, formatValue } from '../../hooks/useDataFlow';
import { useSourceHighlighting } from '../../hooks/useHighlighting';
import { useCanvasStore } from '../../store/canvasStore';
import type { LabelNode as LabelNodeType } from '../../types';

export function LabelNode({ id, data, selected }: NodeProps<LabelNodeType>) {
  const { inputs, hasInputs } = useDataFlow({ nodeId: id, targetHandle: 'input' });
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const removeEdgesToTarget = useCanvasStore((state) => state.removeEdgesToTarget);

  // Local editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
    e.stopPropagation();
  }, [handleSave, handleCancel]);

  // Update value in node data for output handle to pass through
  useEffect(() => {
    if (outputValue !== null && outputValue !== undefined) {
      const dataType = typeof outputValue === 'number' ? 'number' : 'string';
      updateNodeData(id, {
        value: {
          type: dataType,
          value: outputValue,
        },
      });
    }
  }, [outputValue, id, updateNodeData]);

  return (
    <BaseNode label={data.label} selected={selected}>
      <div className="relative">
        {/* Input handle (left) */}
        <NodeEntry id="input" handleType="target" handlePosition={Position.Left}>
          <div className="w-0" />
        </NodeEntry>

        {/* Value display/edit area */}
        <div className="px-2 py-1">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className={`${fontSizeClass} ${alignmentClass} font-mono w-full px-2 py-1 border border-blue-400 rounded outline-none bg-blue-50`}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className={`${fontSizeClass} ${alignmentClass} font-mono min-h-[2em] flex-1 px-2 py-1 rounded transition-colors cursor-text ${
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
                <span className="text-gray-400">Double-click to edit...</span>
              )}
            </div>
          )}
        </div>

        {/* Output handle (right) */}
        <NodeEntry id="output" handleType="source" handlePosition={Position.Right}>
          <div className="w-0" />
        </NodeEntry>
      </div>

      {/* Format indicator */}
      <div className="px-2 py-1 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span className="capitalize">{data.format}</span>
        {isManualMode ? (
          <span className="text-blue-500">manual</span>
        ) : input?.label ? (
          <span className="truncate max-w-[100px]" title={input.label}>
            from: {input.label}
          </span>
        ) : null}
      </div>
    </BaseNode>
  );
}
