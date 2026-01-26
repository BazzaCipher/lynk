import { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeResizer } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { GroupNode as GroupNodeType } from '../../types';

export function GroupNode({ id, data, selected }: NodeProps<GroupNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const handleResize = useCallback(
    (_event: unknown, params: { width: number; height: number }) => {
      updateNodeData(id, {
        width: params.width,
        height: params.height,
      });
    },
    [id, updateNodeData]
  );

  return (
    <>
      <NodeResizer
        minWidth={100}
        minHeight={100}
        isVisible={selected}
        lineClassName="border-blue-400"
        handleClassName="h-3 w-3 bg-white border-2 border-blue-400 rounded"
        onResize={handleResize}
      />
      <div
        className={`
          w-full h-full rounded-lg border-2 border-dashed
          ${selected ? 'border-blue-500 bg-blue-50/30' : 'border-gray-300 bg-gray-50/20'}
          transition-colors
        `}
        style={{
          width: data.width,
          height: data.height,
          backgroundColor: data.backgroundColor || undefined,
        }}
      >
        {/* Group label */}
        <div className="absolute top-0 left-2 -translate-y-1/2 px-2 py-0.5 bg-white rounded text-xs text-gray-500 border border-gray-200">
          {data.label}
        </div>
      </div>
    </>
  );
}
