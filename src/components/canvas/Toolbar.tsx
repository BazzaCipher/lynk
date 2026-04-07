import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCanvasStore } from '../../store/canvasStore';
import { useToast } from '../ui/Toast';

interface FileControlsProps {
  focusName?: boolean;
  onFocusNameHandled?: () => void;
}

export function FileControls({ focusName, onFocusNameHandled }: FileControlsProps) {
  const saveToFile = useCanvasStore((state) => state.saveToFile);
  const canvasName = useCanvasStore((state) => state.canvasName);
  const setCanvasName = useCanvasStore((state) => state.setCanvasName);
  const { showToast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      onFocusNameHandled?.();
    }
  }, [focusName, onFocusNameHandled]);

  const handleSave = async () => {
    const result = await saveToFile();
    if (!result.success) {
      showToast('Save failed: ' + result.warnings.join(', '), 'error');
    } else if (result.warnings.length > 0) {
      showToast('Saved with warnings: ' + result.warnings.join(', '), 'warning');
    } else {
      showToast('Canvas saved successfully', 'success');
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
      {/* Back to site */}
      <Link
        to="/"
        className="p-1.5 text-bridge-400 hover:text-bridge-700 hover:bg-paper-100 rounded transition-colors"
        title="Back to home"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </Link>

      <div className="w-px h-6 bg-paper-200" />

      {/* Canvas name */}
      <input
        ref={nameInputRef}
        type="text"
        value={canvasName}
        onChange={(e) => setCanvasName(e.target.value)}
        className="px-2 py-1 text-sm border border-paper-200 rounded w-20 sm:w-32 focus:outline-none focus:ring-1 focus:ring-copper-400"
        title="Canvas name"
      />

      {/* Save */}
      <button
        onClick={handleSave}
        className="p-1.5 text-bridge-400 hover:text-copper-500 hover:bg-copper-400/10 rounded transition-colors"
        title="Save canvas (Ctrl+S)"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      </button>
    </div>
  );
}
