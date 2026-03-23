import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useCanvasStore } from '../../store/canvasStore';
import { useToast } from '../ui/Toast';
import { nodeTypeConfig } from './nodeDefaults';
import type { XYPosition } from '@xyflow/react';
import type { LynkNodeData } from '../../types/nodes';

interface CanvasContextMenuProps {
  mode: 'create' | 'actions';
  position: { x: number; y: number };
  flowPosition: XYPosition;
  onClose: () => void;
}

function NodeIcon({ type }: { type: string }) {
  switch (type) {
    case 'extractor':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="12" height="16" rx="1.5" />
          <line x1="7" y1="6" x2="13" y2="6" />
          <line x1="7" y1="9" x2="11" y2="9" />
          <circle cx="16.5" cy="16.5" r="5" strokeWidth={1.5} />
          <circle cx="16.5" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
          <line x1="16.5" y1="10" x2="16.5" y2="13" />
          <line x1="16.5" y1="20" x2="16.5" y2="23" />
          <line x1="10" y1="16.5" x2="13" y2="16.5" />
          <line x1="20" y1="16.5" x2="23" y2="16.5" />
        </svg>
      );
    case 'display':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <circle cx="8" cy="9" r="2.5" />
          <polyline points="22,17 16,11 10,17" />
          <polyline points="14,15 17,12 22,17" />
        </svg>
      );
    case 'calculation':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <line x1="7" y1="7" x2="7" y2="11" />
          <line x1="5" y1="9" x2="9" y2="9" />
          <line x1="15" y1="9" x2="19" y2="9" />
          <line x1="5.5" y1="15.5" x2="8.5" y2="18.5" />
          <line x1="8.5" y1="15.5" x2="5.5" y2="18.5" />
          <line x1="15" y1="16" x2="19" y2="16" />
          <line x1="15" y1="18.5" x2="19" y2="18.5" />
        </svg>
      );
    case 'sheet':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2" />
          <line x1="2" y1="8" x2="22" y2="8" />
          <line x1="2" y1="14" x2="22" y2="14" />
          <line x1="9" y1="2" x2="9" y2="22" />
          <line x1="16" y1="2" x2="16" y2="22" />
        </svg>
      );
    case 'label':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4.5A1.5 1.5 0 013.5 3h7.59a1.5 1.5 0 011.06.44l8.41 8.41a1.5 1.5 0 010 2.12l-7.59 7.59a1.5 1.5 0 01-2.12 0L2.44 13.15A1.5 1.5 0 012 12.09V4.5z" />
          <circle cx="7" cy="8" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

export function CanvasContextMenu({ mode, position, flowPosition, onClose }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const addNode = useCanvasStore((state) => state.addNode);
  const saveToFile = useCanvasStore((state) => state.saveToFile);
  const loadFromFile = useCanvasStore((state) => state.loadFromFile);
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

  const handleAddNode = (type: 'display' | 'extractor' | 'calculation' | 'sheet' | 'label', data: Record<string, unknown>) => {
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

  const handleLoad = async () => {
    onClose();
    const result = await loadFromFile();
    if (!result.success && result.error) {
      const errorMsg = result.error.startsWith('Invalid canvas file:')
        ? 'Invalid canvas file. The file may be corrupted or in an incompatible format.'
        : result.error;
      showToast(errorMsg, 'error');
    } else if (result.success) {
      showToast('Canvas loaded successfully', 'success');
    }
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
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px]"
    >
      {mode === 'create' && (
        <>
          <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
            Add node
          </div>
          {nodeTypeConfig.map((config) => (
            <button
              key={config.type}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-left"
              onClick={() => handleAddNode(config.type, config.data as unknown as Record<string, unknown>)}
            >
              <NodeIcon type={config.icon} />
              {config.label}
            </button>
          ))}
        </>
      )}
      {mode === 'actions' && (
        <>
          <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
            Canvas
          </div>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-left"
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
            className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-left"
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
            className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-left"
            onClick={handleFiles}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Files
          </button>
          <hr className="my-1 border-gray-100" />
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
