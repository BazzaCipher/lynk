import { Panel } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useToast } from '../ui/Toast';

export function LayoutControls() {
  const applyLayout = useCanvasStore((state) => state.applyLayout);
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const nodes = useCanvasStore((state) => state.nodes);
  const { showToast } = useToast();

  const handleLayout = (type: 'tree' | 'grid') => {
    if (nodes.length === 0) {
      showToast('No nodes to layout', 'warning');
      return;
    }
    pushHistory();
    applyLayout(type);
    showToast(`Applied ${type} layout`, 'info');
  };

  return (
    <Panel position="bottom-left" className="!left-12">
      <div className="flex items-center gap-1 bg-white rounded shadow-md px-1 py-0.5">
        <span className="text-[10px] text-bridge-500 font-medium">Layout</span>
        <button
          onClick={() => handleLayout('tree')}
          className="px-1.5 py-0.5 text-[11px] bg-paper-100 hover:bg-paper-200 rounded transition-colors"
          title="Tree layout - Extractors on left, downstream nodes in columns"
        >
          Tree
        </button>
        <button
          onClick={() => handleLayout('grid')}
          className="px-1.5 py-0.5 text-[11px] bg-paper-100 hover:bg-paper-200 rounded transition-colors"
          title="Grid layout - Arrange nodes in a grid pattern"
        >
          Grid
        </button>
      </div>
    </Panel>
  );
}
