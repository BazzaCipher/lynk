import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useCanvasStore } from '../../store/canvasStore';
import { useToast } from '../ui/Toast';
import { getCreatableTypes } from '../../core/nodes/nodeRegistry';
import { NodeIcon } from '../ui/NodeIcon';
import type { XYPosition } from '@xyflow/react';
import type { LynkNodeData, LynkNodeType } from '../../types/nodes';

interface CanvasContextMenuProps {
  mode: 'create' | 'actions';
  position: { x: number; y: number };
  flowPosition: XYPosition;
  onClose: () => void;
  onLoad: () => Promise<void>;
}

export function CanvasContextMenu({ mode, position, flowPosition, onClose, onLoad }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const addNode = useCanvasStore((state) => state.addNode);
  const saveToFile = useCanvasStore((state) => state.saveToFile);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const toggleFileRegistry = useCanvasStore((state) => state.toggleFileRegistry);
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on scroll, wheel, or drag
  useEffect(() => {
    const close = () => onClose();
    let dragOrigin: { x: number; y: number } | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        dragOrigin = { x: e.clientX, y: e.clientY };
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragOrigin) {
        const dx = e.clientX - dragOrigin.x;
        const dy = e.clientY - dragOrigin.y;
        if (dx * dx + dy * dy > 16) close();
      }
    };
    const onPointerUp = () => { dragOrigin = null; };

    window.addEventListener('scroll', close, true);
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('wheel', close);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onClose]);

  const handleAddNode = (type: LynkNodeType, data: Record<string, unknown>) => {
    addNode(type, flowPosition, data as LynkNodeData);
    onClose();
  };

  const handleSave = async () => {
    onClose();
    const result = await saveToFile();
    if (!result.success) {
      showToast('Save failed: ' + result.warnings.join(', '), 'error');
    } else if (result.warnings.length > 0) {
      showToast('Saved with warnings: ' + result.warnings.join(', '), 'warning');
    } else {
      showToast('Canvas saved successfully', 'success');
    }
  };

  const handleLoad = () => {
    onClose();
    onLoad();
  };

  const handleClear = () => {
    onClose();
    if (confirm('Clear the canvas? This cannot be undone.')) {
      clearCanvas();
      showToast('Canvas cleared', 'info');
    }
  };

  const handleFiles = () => {
    toggleFileRegistry();
    onClose();
  };

  const menu = (
    <div
      ref={menuRef}
      style={{ top: position.y, left: position.x }}
      className="fixed z-50 bg-white border border-paper-200 rounded-lg shadow-xl py-1 min-w-[180px]"
    >
      {mode === 'create' && (
        <>
          <div className="px-3 py-1.5 text-xs font-medium text-bridge-400 uppercase tracking-wide">
            Add node
          </div>
          {getCreatableTypes().map((def) => (
            <button
              key={def.type}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-paper-50 text-left"
              onClick={() => handleAddNode(def.type as LynkNodeType, def.defaultData)}
            >
              <NodeIcon type={def.icon} />
              {def.label}
            </button>
          ))}
        </>
      )}
      {mode === 'actions' && (
        <>
          <div className="px-3 py-1.5 text-xs font-medium text-bridge-400 uppercase tracking-wide">
            Canvas
          </div>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-paper-50 text-left"
            onClick={handleSave}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-paper-50 text-left"
            onClick={handleLoad}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
              <line x1="3" y1="21" x2="21" y2="21" />
            </svg>
            Load
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-paper-50 text-left"
            onClick={handleFiles}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Files
          </button>
          <hr className="my-1 border-paper-100" />
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-red-50 hover:text-red-600 text-left"
            onClick={handleClear}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h4M2.5 4h11M5.5 4v8.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V4M6.5 7v4M9.5 7v4" />
            </svg>
            Clear Canvas
          </button>
        </>
      )}
    </div>
  );

  return ReactDOM.createPortal(menu, document.body);
}
