import { useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useDataFlow, formatValue } from '../../hooks/useDataFlow';
import { useSourceHighlighting } from '../../hooks/useHighlighting';
import type { LabelNode as LabelNodeType } from '../../types';

export function LabelNode({ id, data, selected }: NodeProps<LabelNodeType>) {
  const { inputs, hasInputs } = useDataFlow({ nodeId: id, targetHandle: 'input' });

  // Get the first (and only) input value
  const input = inputs[0];

  // Use highlighting hook for the input source
  const { isHighlighted, onMouseEnter, onMouseLeave, onClick } = useSourceHighlighting(input?.source ?? null);

  // Resolve display value
  const displayValue = useMemo(() => {
    if (!input) return null;

    const value = input.numericValue ?? input.value;
    return formatValue(value, data.format);
  }, [input, data.format]);

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

  return (
    <BaseNode label={data.label} selected={selected}>
      <NodeEntry id="input" handleType="target" handlePosition={Position.Left}>
        <div
          className={`${fontSizeClass} ${alignmentClass} font-mono min-h-[2em] flex-1 px-2 py-1 rounded transition-colors ${
            hasInputs && input?.source
              ? 'cursor-pointer hover:bg-gray-100'
              : ''
          } ${isHighlighted ? 'bg-blue-100 ring-1 ring-blue-400' : ''}`}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
        >
          {displayValue ?? (
            <span className="text-gray-400">Connect a value...</span>
          )}
        </div>
      </NodeEntry>

      {/* Format indicator */}
      <div className="px-2 py-1 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span className="capitalize">{data.format}</span>
        {input?.label && (
          <span className="truncate max-w-[100px]" title={input.label}>
            from: {input.label}
          </span>
        )}
      </div>
    </BaseNode>
  );
}
