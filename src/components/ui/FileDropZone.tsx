interface FileDropZoneProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  accept?: string;
  compact?: boolean;
  onPickFromRegistry?: () => void;
}

export function FileDropZone({
  onFileSelect,
  onDrop,
  onDragOver,
  accept = 'image/*,application/pdf',
  compact = false,
  onPickFromRegistry,
}: FileDropZoneProps) {
  return (
    <div onDrop={onDrop} onDragOver={onDragOver}>
      <label
        className={`
          flex flex-col items-center justify-center cursor-pointer
          hover:bg-gray-50 transition-colors rounded border-2 border-dashed border-gray-300
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
          className={`text-gray-300 mb-2 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}
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
        <div className={`text-gray-400 text-center ${compact ? 'text-xs' : 'text-sm'}`}>
          <p>Drop a file or click to browse</p>
          {!compact && (
            <p className="text-xs mt-1 text-gray-300">PDF or image</p>
          )}
        </div>
      </label>
      {onPickFromRegistry && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPickFromRegistry();
          }}
          className="w-full mt-1 text-[10px] text-indigo-500 hover:text-indigo-700 text-center py-0.5"
        >
          or choose from loaded files
        </button>
      )}
    </div>
  );
}
