import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { useCanvasStore } from '../store/canvasStore';
import {
  hasUnsavedWork,
  clearLocalStorageDraft,
  type StoredCanvasData,
} from '../hooks/useLocalStorageSync';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function SessionRecovery() {
  const [showModal, setShowModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<StoredCanvasData | null>(null);
  const importCanvas = useCanvasStore((state) => state.importCanvas);

  useEffect(() => {
    // Check for unsaved work on mount
    const unsavedWork = hasUnsavedWork();
    if (unsavedWork) {
      setRecoveryData(unsavedWork);
      setShowModal(true);
    }
  }, []);

  const handleRestore = () => {
    if (!recoveryData) return;

    const result = importCanvas(recoveryData.canvas);
    if (!result.success) {
      console.error('Failed to restore session:', result.error);
    }

    setShowModal(false);
    setRecoveryData(null);
  };

  const handleDiscard = () => {
    clearLocalStorageDraft();
    setShowModal(false);
    setRecoveryData(null);
  };

  if (!showModal || !recoveryData) return null;

  const nodeCount = recoveryData.canvas.nodes.length;
  const savedAt = formatRelativeTime(recoveryData.savedAt);
  const hasMissingFiles = recoveryData.missingFileIds.length > 0;

  return (
    <Modal isOpen={showModal} onClose={handleDiscard} title="Recover Previous Session?">
      <div className="p-6 max-w-md">
        <p className="text-gray-600 mb-4">
          Found unsaved work from {savedAt}:
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-medium">{recoveryData.canvas.metadata.name}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {nodeCount} node{nodeCount === 1 ? '' : 's'}
          </div>
        </div>

        {hasMissingFiles && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> {recoveryData.missingFileIds.length} file{recoveryData.missingFileIds.length === 1 ? '' : 's'} will need to be re-imported (PDFs/images are not stored in browser storage).
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleRestore}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            Restore
          </button>
        </div>
      </div>
    </Modal>
  );
}
