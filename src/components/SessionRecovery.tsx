import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { hasUnsavedWork } from '../hooks/useLocalStorageSync';

export function SessionRecovery() {
  const importCanvas = useCanvasStore((state) => state.importCanvas);

  useEffect(() => {
    const unsavedWork = hasUnsavedWork();
    if (unsavedWork) {
      const result = importCanvas(unsavedWork.canvas);
      if (!result.success) {
        console.error('Failed to restore session:', result.error);
      }
    }
  }, [importCanvas]);

  return null;
}
