import { useState, useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { getSuggestions } from '../../utils/suggestions';
import type { LynkNode, LynkNodeType, CalculationNodeData, LabelNodeData, SheetNodeData } from '../../types';
import { useReactFlow } from '@xyflow/react';

const defaultNodeData: Record<string, () => CalculationNodeData | LabelNodeData | SheetNodeData> = {
  calculation: () => ({
    label: 'Calculation',
    operation: 'sum',
    precision: 2,
    inputs: [],
    result: undefined,
    inputCache: {},
  }),
  label: () => ({
    label: 'Label',
    format: 'number' as const,
    value: undefined,
    fontSize: 'medium' as const,
    alignment: 'center' as const,
  }),
  sheet: () => ({
    label: 'Sheet',
    subheaders: [],
  }),
};

export function SuggestionBar() {
  const nodes = useCanvasStore((state) => state.nodes) as LynkNode[];
  const edges = useCanvasStore((state) => state.edges);
  const addNode = useCanvasStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();

  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('lynk-dismissed-suggestions');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const suggestions = useMemo(() => {
    return getSuggestions(nodes, edges).filter((s) => !dismissed.has(s.id));
  }, [nodes, edges, dismissed]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem('lynk-dismissed-suggestions', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleAction = useCallback(
    (nodeType: LynkNodeType) => {
      const factory = defaultNodeData[nodeType];
      if (!factory) return;
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      addNode(nodeType, position, factory());
    },
    [addNode, screenToFlowPosition]
  );

  const current = suggestions[0];
  if (!current) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2
                    bg-white border border-paper-200 text-sm text-bridge-700 px-4 py-2 rounded-lg shadow-md
                    max-w-lg">
      <span className="flex-1">{current.message}</span>
      {current.action && (
        <button
          onClick={() => handleAction(current.action!.nodeType)}
          className="px-2.5 py-1 text-xs font-medium bg-copper-400/20 hover:bg-copper-400/30 text-copper-600 rounded transition-colors whitespace-nowrap"
        >
          {current.action.label}
        </button>
      )}
      <button
        onClick={() => dismiss(current.id)}
        className="ml-1 text-bridge-400 hover:text-bridge-600 text-lg leading-none"
        title="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
