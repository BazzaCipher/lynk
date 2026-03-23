import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useCanvasStore } from '../../store/canvasStore';
import type { LynkNode } from '../../types';

interface NodeContextMenuProps {
  node: LynkNode;
  position: { x: number; y: number };
  onClose: () => void;
  magneticMode: boolean;
  onToggleMagneticMode: () => void;
}

export function NodeContextMenu({
  node,
  position,
  onClose,
  magneticMode,
  onToggleMagneticMode,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const removeNode = useCanvasStore((state) => state.removeNode);
  const pushHistory = useCanvasStore((state) => state.pushHistory);

  // Close on outside mousedown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
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

  const handleMagneticConnect = () => {
    onToggleMagneticMode();
    onClose();
  };

  const handleDeleteNode = () => {
    pushHistory();
    removeNode(node.id);
    onClose();
  };

  const menu = (
    <div
      ref={menuRef}
      style={{ top: position.y, left: position.x }}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px]"
    >
      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
        Node actions
      </div>

      <button
        className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-left"
        onClick={handleMagneticConnect}
      >
        {magneticMode ? (
          <svg className="w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
          </svg>
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}
        <span className={magneticMode ? 'text-indigo-600 font-medium' : ''}>
          Magnetic Connect
        </span>
      </button>

      <hr className="my-1 border-gray-100" />

      <button
        className="flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer hover:bg-red-50 hover:text-red-600 text-left"
        onClick={handleDeleteNode}
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h4M2.5 4h11M5.5 4v8.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V4M6.5 7v4M9.5 7v4" />
        </svg>
        Delete Node
      </button>
    </div>
  );

  return ReactDOM.createPortal(menu, document.body);
}
