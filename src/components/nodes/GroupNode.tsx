import type { NodeProps } from '@xyflow/react';
import type { GroupNode as GroupNodeType } from '../../types';

const labelStyles = {
  selected: 'bg-copper-400/20 text-copper-600 border border-copper-400',
  idle: 'bg-white text-bridge-500 border border-paper-200 hover:bg-paper-50 hover:text-bridge-700',
} as const;

export function GroupNode({ data, selected }: NodeProps<GroupNodeType>) {
  return (
    <div
      className={`rounded-xl transition-colors border-2 border-dashed ${selected ? 'border-copper-400 bg-copper-400/20/60' : 'border-paper-200 bg-paper-50/30'}`}
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
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-paper-100/80 border-2 border-paper-300 rounded-tl-xl" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-paper-100/80 border-2 border-paper-300 rounded-tr-xl" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-paper-100/80 border-2 border-paper-300 rounded-bl-xl" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-paper-100/80 border-2 border-paper-300 rounded-br-xl" />
        </>
      )}
    </div>
  );
}
