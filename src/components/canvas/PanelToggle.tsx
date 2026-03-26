interface PanelToggleProps {
  side: 'left' | 'right';
  isOpen: boolean;
  onClick: () => void;
  label: string;
}

export function PanelToggle({ side, isOpen, onClick, label }: PanelToggleProps) {
  // Both panels use flex layout and push the canvas, so toggles stay at the edge
  const positionClass = side === 'left'
    ? 'top-4 left-2'
    : 'top-4 right-2';

  // Arrow direction:
  // Left panel closed: > (point right, toward panel opening direction)
  // Left panel open: < (point left, to close/collapse)
  // Right panel closed: < (point left, toward panel opening direction)
  // Right panel open: > (point right, to close/collapse)
  const arrowPath = (side === 'left') !== isOpen
    ? 'M9 5l7 7-7 7'   // >
    : 'M15 19l-7-7 7-7'; // <

  const title = isOpen ? `Close ${label}` : `Open ${label}`;

  return (
    <button
      onClick={onClick}
      className={`absolute ${positionClass} z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md
                  text-bridge-400 hover:text-copper-500 hover:bg-copper-400/10 hover:shadow-lg
                  transition-all duration-200 group`}
      title={title}
    >
      <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={arrowPath} />
      </svg>
    </button>
  );
}
