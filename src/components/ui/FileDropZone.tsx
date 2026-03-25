import { useState, useRef } from 'react';

interface FileDropZoneProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  accept?: string;
  compact?: boolean;
  onPickFromRegistry?: () => void;
  allowFolders?: boolean;
}

export function FileDropZone({
  onFileSelect,
  onDrop,
  onDragOver,
  accept = 'image/*,application/pdf',
  compact = false,
  onPickFromRegistry,
  allowFolders = false,
}: FileDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounter = useRef(0);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    dragCounter.current = 0;
    setIsDragActive(false);
    onDrop(e);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={onDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <label
        className={`
          flex flex-col items-center justify-center cursor-pointer
          transition-colors rounded border-2 border-dashed
          ${isDragActive
            ? 'border-copper-400 bg-copper-400/10'
            : 'border-paper-300 hover:bg-paper-50'
          }
          ${compact ? 'h-28 p-2' : 'h-32 p-4'}
        `}
      >
        <input
          type="file"
          accept={accept}
          onChange={onFileSelect}
          className="hidden"
        />
        {/* Combined document/image icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`${isDragActive ? 'text-copper-400' : 'text-bridge-400'} mb-2 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          {/* Document with image corner */}
          <path d="M4 4a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          <path
            fill="white"
            d="M14 2v4a2 2 0 002 2h4"
          />
          <path
            fill="currentColor"
            opacity="0.6"
            d="M8 12l2 3 2-2 3 4H7l1-5z"
          />
        </svg>
        <div className={`${isDragActive ? 'text-copper-500' : 'text-bridge-400'} text-center ${compact ? 'text-xs' : 'text-sm'}`}>
          {isDragActive ? (
            <p>Release to upload</p>
          ) : (
            <>
              <p>Drop a file{allowFolders ? ' or folder' : ''} or click to browse</p>
              {!compact && (
                <p className="text-xs mt-1 text-bridge-400">PDF or image</p>
              )}
            </>
          )}
        </div>
      </label>
      <div className="flex items-center justify-center gap-2 mt-1">
        {allowFolders && (
          <>
            <input
              ref={folderInputRef}
              type="file"
              onChange={onFileSelect}
              className="hidden"
              {...({ webkitdirectory: '', directory: '' } as any)}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              className="text-[10px] text-copper-500 hover:text-copper-600 py-0.5"
            >
              upload folder
            </button>
          </>
        )}
        {onPickFromRegistry && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPickFromRegistry();
            }}
            className="text-[10px] text-copper-500 hover:text-copper-600 py-0.5"
          >
            or choose from loaded files
          </button>
        )}
      </div>
    </div>
  );
}
