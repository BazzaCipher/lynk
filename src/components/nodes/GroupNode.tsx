import type { NodeProps } from '@xyflow/react';
import type { GroupNode as GroupNodeType } from '../../types';

const labelStyles = {
  selected: 'bg-blue-100 text-blue-700 border border-blue-300',
  idle: 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700',
} as const;

export function GroupNode({ data, selected }: NodeProps<GroupNodeType>) {
  return (
    <div
      className={`rounded-xl transition-colors border-2 border-dashed ${selected ? 'border-blue-400 bg-blue-100/60' : 'border-gray-200 bg-gray-50/30'}`}
      style={{
        width: data.width,
        height: data.height,
        backgroundColor: data.backgroundColor || undefined,
      }}
    >
      <div
        className={`absolute -top-6 left-2 px-2 py-0.5 rounded text-xs cursor-pointer transition-colors select-none ${labelStyles[selected ? 'selected' : 'idle']}`}
      >
        {data.label}
      </div>
      {selected && (
        <>
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-100/80 border-2 border-gray-300 rounded-tl-xl" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-100/80 border-2 border-gray-300 rounded-tr-xl" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-100/80 border-2 border-gray-300 rounded-bl-xl" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-100/80 border-2 border-gray-300 rounded-br-xl" />
        </>
      )}
    </div>
  );
}
