import { useCallback, useRef, useState } from 'react';

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

interface ResizeHandleProps {
  corner: ResizeCorner;
  onResize: (deltaWidth: number, deltaHeight: number, corner: ResizeCorner, shiftKey: boolean) => void;
  onResizeEnd?: () => void;
}

const CURSOR_MAP: Record<ResizeCorner, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
};

const POSITION_MAP: Record<ResizeCorner, { top?: number; bottom?: number; left?: number; right?: number }> = {
  nw: { top: 0, left: 0 },
  ne: { top: 0, right: 0 },
  sw: { bottom: 0, left: 0 },
  se: { bottom: 0, right: 0 },
};

const TRANSLATE_MAP: Record<ResizeCorner, string> = {
  nw: 'translate(-50%, -50%)',
  ne: 'translate(50%, -50%)',
  sw: 'translate(-50%, 50%)',
  se: 'translate(50%, 50%)',
};

export function ResizeHandle({ corner, onResize, onResizeEnd }: ResizeHandleProps) {
  const [isActive, setIsActive] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsActive(true);
      startRef.current = { x: e.clientX, y: e.clientY };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!startRef.current) return;
        const dx = moveEvent.clientX - startRef.current.x;
        const dy = moveEvent.clientY - startRef.current.y;
        startRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
        onResize(dx, dy, corner, moveEvent.shiftKey);
      };

      const handleMouseUp = () => {
        setIsActive(false);
        startRef.current = null;
        onResizeEnd?.();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [corner, onResize, onResizeEnd]
  );

  return (
    <div
      className="absolute"
      style={{
        ...POSITION_MAP[corner],
        transform: TRANSLATE_MAP[corner],
        cursor: CURSOR_MAP[corner],
        zIndex: 50,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Invisible hit area (40px) - larger to ensure clickable region inside node bounds */}
      <div
        className="flex items-center justify-center"
        style={{ width: 40, height: 40 }}
      >
        {/* Visible handle (16px) */}
        <div
          className="rounded-sm transition-transform"
          style={{
            width: 16,
            height: 16,
            backgroundColor: isActive ? '#a85f3e' : '#ffffff',
            border: `2px solid ${isActive ? '#8b4d32' : '#c27350'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transform: isActive ? 'scale(1.15)' : undefined,
          }}
        />
      </div>
    </div>
  );
}
