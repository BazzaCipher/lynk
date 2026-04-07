import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import { getCreatableTypes } from '../../core/nodes/nodeRegistry';
import { NodeIcon } from '../ui/NodeIcon';
import type { LynkNodeData, LynkNodeType } from '../../types';

export function NodeCreationBar() {
  const addNode = useCanvasStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();

  const handleAddNode = (type: LynkNodeType, data: LynkNodeData) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const position = screenToFlowPosition({
      x: centerX + (Math.random() - 0.5) * 100,
      y: centerY + (Math.random() - 0.5) * 100,
    });
    addNode(type, position, data);
  };

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                 flex items-center gap-1.5 bg-white rounded-lg shadow-md p-2
                 max-w-[calc(100vw-4rem)] overflow-x-auto"
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {getCreatableTypes().map((def) => (
        <button
          key={def.type}
          onClick={() => handleAddNode(def.type as LynkNodeType, def.defaultData as LynkNodeData)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-100 hover:bg-paper-200 rounded transition-colors whitespace-nowrap shrink-0 touch-manipulation"
          title={`Add ${def.label} Node${def.description ? ` - ${def.description}` : ''}`}
        >
          <NodeIcon type={def.icon} />
          {def.shortLabel || def.label}
        </button>
      ))}
    </div>
  );
}
