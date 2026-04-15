import { Modal } from '../ui/Modal';
import type { FileUploadResult } from '../../hooks/useFileUpload';

export type DuplicateResolution = 'insert-all' | 'insert-new-only';

interface DuplicateFilesDialogProps {
  isOpen: boolean;
  duplicates: FileUploadResult[];
  newFiles: FileUploadResult[];
  onResolve: (resolution: DuplicateResolution) => void;
}

export function DuplicateFilesDialog({
  isOpen,
  duplicates,
  newFiles,
  onResolve,
}: DuplicateFilesDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={() => onResolve('insert-new-only')} title="Duplicate files detected">
      <div className="p-4 space-y-4 min-w-[340px] max-w-md">
        <p className="text-sm text-bridge-600">
          {duplicates.length} file{duplicates.length !== 1 ? 's' : ''} already
          {duplicates.length !== 1 ? ' exist' : ' exists'} in this canvas:
        </p>

        <ul className="text-sm text-bridge-700 space-y-1 max-h-40 overflow-y-auto">
          {duplicates.map((f) => (
            <li key={f.fileId} className="flex items-center gap-2">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="truncate">{f.fileName}</span>
            </li>
          ))}
        </ul>

        {newFiles.length > 0 && (
          <p className="text-xs text-bridge-400">
            {newFiles.length} new file{newFiles.length !== 1 ? 's' : ''} will be added either way.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={() => onResolve('insert-all')}
            className="px-3 py-1.5 text-sm rounded-md border border-paper-200 text-bridge-600 hover:bg-paper-50 transition-colors"
          >
            Insert all
          </button>
          <button
            onClick={() => onResolve('insert-new-only')}
            className="px-3 py-1.5 text-sm rounded-md bg-copper-500 text-white hover:bg-copper-600 transition-colors"
            autoFocus
          >
            Only insert new
          </button>
        </div>
      </div>
    </Modal>
  );
}
