import { useCanvasStore } from '../../store/canvasStore';

export function UndoRedoControls() {
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const canUndo = useCanvasStore((state) => state.canUndo);
  const canRedo = useCanvasStore((state) => state.canRedo);

  return (
    <div className="flex items-center gap-1 bg-white rounded-lg shadow-md p-1.5">
      <button
        onClick={undo}
        disabled={!canUndo()}
        className="p-1.5 rounded transition-colors text-bridge-400 hover:text-copper-500 hover:bg-copper-400/10 disabled:opacity-30 disabled:hover:text-bridge-400 disabled:hover:bg-transparent"
        title="Undo (Ctrl+Z)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l5-5M3 10l5 5" />
        </svg>
      </button>
      <button
        onClick={redo}
        disabled={!canRedo()}
        className="p-1.5 rounded transition-colors text-bridge-400 hover:text-copper-500 hover:bg-copper-400/10 disabled:opacity-30 disabled:hover:text-bridge-400 disabled:hover:bg-transparent"
        title="Redo (Ctrl+Y)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2M21 10l-5-5M21 10l-5 5" />
        </svg>
      </button>
    </div>
  );
}
