import { useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useDataFlow, formatValue } from '../../hooks/useDataFlow';
import { useCanvasStore } from '../../store/canvasStore';
import type { LabelNode as LabelNodeType } from '../../types';

export function LabelNode({ id, data, selected }: NodeProps<LabelNodeType>) {
  const { inputs, hasInputs } = useDataFlow({ nodeId: id, targetHandle: 'input' });
  const setHighlightedRegion = useCanvasStore((state) => state.setHighlightedRegion);
  const highlightedRegion = useCanvasStore((state) => state.highlightedRegion);

  // Get the first (and only) input value
  const input = inputs[0];

  // Resolve display value
  const displayValue = useMemo(() => {
    if (!input) return null;

    const value = input.numericValue ?? input.value;
    return formatValue(value, data.format);
  }, [input, data.format]);

  // Check if this input is highlighted
  const isHighlighted = useMemo(() => {
    if (!input?.source || !highlightedRegion) return false;
    return (
      highlightedRegion.nodeId === input.source.nodeId &&
      highlightedRegion.regionId === input.source.regionId
    );
  }, [input, highlightedRegion]);

  // Handle hover on value
  const handleMouseEnter = () => {
    if (input?.source) {
      setHighlightedRegion({
        nodeId: input.source.nodeId,
        regionId: input.source.regionId,
      });
    }
  };

  const handleMouseLeave = () => {
    if (!isHighlighted) {
      setHighlightedRegion(null);
    }
  };

  // Handle click on value (toggle persistent highlight)
  const handleClick = () => {
    if (!input?.source) return;

    if (isHighlighted) {
      setHighlightedRegion(null);
    } else {
      setHighlightedRegion({
        nodeId: input.source.nodeId,
        regionId: input.source.regionId,
      });
    }
  };

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
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
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
