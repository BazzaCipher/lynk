interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onZoomOut}
        className="w-6 h-6 flex items-center justify-center text-xs rounded bg-paper-100 text-bridge-600 hover:bg-paper-200 transition-colors"
      >
        −
      </button>
      <span className="text-xs text-bridge-500 w-10 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="w-6 h-6 flex items-center justify-center text-xs rounded bg-paper-100 text-bridge-600 hover:bg-paper-200 transition-colors"
      >
        +
      </button>
      {zoom !== 1 && (
        <button
          onClick={onReset}
          className="px-1.5 py-0.5 text-xs text-bridge-500 hover:text-bridge-700 transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );
}
