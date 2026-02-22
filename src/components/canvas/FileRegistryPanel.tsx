import { useState, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import { BlobRegistry, type FileMetadata } from '../../store/canvasPersistence';
import { getFileTypeColor } from '../../utils/colors';
import { formatFileSize } from '../../utils/formatting';

function FileThumbnail({ meta }: { meta: FileMetadata }) {
  const blobUrl = BlobRegistry.getUrlFromId(meta.fileId);
  const typeColor = getFileTypeColor(meta.mimeType);

  if (!blobUrl) {
    return (
      <div
        className="w-10 h-10 rounded flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
      >
        {typeColor.label}
      </div>
    );
  }

  if (meta.fileType === 'image') {
    return (
      <img
        src={blobUrl}
        alt={meta.fileName}
        className="w-10 h-10 rounded object-cover"
      />
    );
  }

  return (
    <div
      className="w-10 h-10 rounded flex items-center justify-center"
      style={{ backgroundColor: typeColor.bg }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill={typeColor.text}>
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

function FileEntryRow({
  meta,
  onJumpToNode,
  onReuse,
  onDelete,
}: {
  meta: FileMetadata;
  onJumpToNode: (nodeId: string) => void;
  onReuse: (meta: FileMetadata) => void;
  onDelete: (fileId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = getFileTypeColor(meta.mimeType);
  const nodeIds = Array.from(meta.nodeIds);
  const date = new Date(meta.registeredAt);

  return (
    <div className="p-2 border-b border-gray-100 hover:bg-gray-50">
      <div className="flex items-center gap-2">
        <FileThumbnail meta={meta} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-900 truncate">{meta.fileName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="px-1 py-0.5 text-[8px] font-semibold rounded"
              style={{
                backgroundColor: typeColor.bg,
                color: typeColor.text,
                border: `1px solid ${typeColor.border}`,
              }}
            >
              {typeColor.label}
            </span>
            <span className="text-[10px] text-gray-400">
              {formatFileSize(meta.size)}
            </span>
            <span className="text-[10px] text-gray-400">
              {date.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Node references */}
      <div className="mt-1.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-gray-500 hover:text-gray-700"
        >
          Used by {nodeIds.length} node{nodeIds.length !== 1 ? 's' : ''}
          {nodeIds.length > 0 && (expanded ? ' \u25B2' : ' \u25BC')}
        </button>
        {expanded && nodeIds.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {nodeIds.map((nid) => (
              <button
                key={nid}
                onClick={() => onJumpToNode(nid)}
                className="block text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline pl-2"
              >
                {nid}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 mt-1.5">
        {nodeIds.length > 0 && (
          <button
            onClick={() => onJumpToNode(nodeIds[0])}
            className="px-1.5 py-0.5 text-[10px] bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors"
            title="Jump to first node using this file"
          >
            Jump
          </button>
        )}
        <button
          onClick={() => onReuse(meta)}
          className="px-1.5 py-0.5 text-[10px] bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
          title="Create new node with this file"
        >
          Reuse
        </button>
        {nodeIds.length === 0 && (
          <button
            onClick={() => onDelete(meta.fileId)}
            className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
            title="Delete unreferenced file"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function FileRegistryPanel() {
  const fileRegistryOpen = useCanvasStore((s) => s.fileRegistryOpen);
  const toggleFileRegistry = useCanvasStore((s) => s.toggleFileRegistry);
  const fileRegistrySearch = useCanvasStore((s) => s.fileRegistrySearch);
  const setFileRegistrySearch = useCanvasStore((s) => s.setFileRegistrySearch);
  const fileRegistrySort = useCanvasStore((s) => s.fileRegistrySort);
  const setFileRegistrySort = useCanvasStore((s) => s.setFileRegistrySort);
  const getSortedFilteredFiles = useCanvasStore((s) => s.getSortedFilteredFiles);
  const getDuplicateGroups = useCanvasStore((s) => s.getDuplicateGroups);
  const refreshFileRegistry = useCanvasStore((s) => s.refreshFileRegistry);
  const addNode = useCanvasStore((s) => s.addNode);

  // Read version to trigger reactivity
  useCanvasStore((s) => s._fileRegistryVersion);

  const { fitView, screenToFlowPosition } = useReactFlow();

  const files = getSortedFilteredFiles();
  const duplicateGroups = getDuplicateGroups();
  const hasDuplicates = duplicateGroups.size > 0;

  const handleJumpToNode = useCallback(
    (nodeId: string) => {
      fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
    },
    [fitView]
  );

  const handleReuse = useCallback(
    (meta: FileMetadata) => {
      const blobUrl = BlobRegistry.getUrlFromId(meta.fileId);
      if (!blobUrl) return;

      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const nodeId = addNode('extractor', center, {
        label: meta.fileName,
        fileId: meta.fileId,
        fileUrl: blobUrl,
        fileName: meta.fileName,
        fileType: meta.fileType,
        currentPage: 1,
        totalPages: 1,
        regions: [],
      });

      BlobRegistry.addNodeReference(meta.fileId, nodeId);
      refreshFileRegistry();
    },
    [addNode, screenToFlowPosition, refreshFileRegistry]
  );

  const handleDelete = useCallback(
    (fileId: string) => {
      const meta = BlobRegistry.getMetadata(fileId);
      if (meta && meta.nodeIds.size > 0) return; // Can't delete referenced files

      const blobUrl = BlobRegistry.getUrlFromId(fileId);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        BlobRegistry.urlToId.delete(blobUrl);
      }
      BlobRegistry.idToUrl.delete(fileId);
      BlobRegistry.blobs.delete(fileId);
      BlobRegistry.metadata.delete(fileId);
      refreshFileRegistry();
    },
    [refreshFileRegistry]
  );

  const handleSortClick = useCallback(
    (field: 'name' | 'type' | 'size' | 'date') => {
      if (fileRegistrySort.field === field) {
        setFileRegistrySort(field, fileRegistrySort.direction === 'asc' ? 'desc' : 'asc');
      } else {
        setFileRegistrySort(field, 'asc');
      }
    },
    [fileRegistrySort, setFileRegistrySort]
  );

  if (!fileRegistryOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-72 bg-white shadow-lg border-l border-gray-200 z-20 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Files</h3>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
            {files.length}
          </span>
        </div>
        <button
          onClick={toggleFileRegistry}
          className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-100">
        <input
          type="text"
          value={fileRegistrySearch}
          onChange={(e) => setFileRegistrySearch(e.target.value)}
          placeholder="Search files..."
          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Sort controls */}
      <div className="px-2 py-1.5 border-b border-gray-100 flex gap-1">
        {(['name', 'type', 'size', 'date'] as const).map((field) => (
          <button
            key={field}
            onClick={() => handleSortClick(field)}
            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
              fileRegistrySort.field === field
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {field.charAt(0).toUpperCase() + field.slice(1)}
            {fileRegistrySort.field === field && (
              <span className="ml-0.5">{fileRegistrySort.direction === 'asc' ? '\u2191' : '\u2193'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Duplicate alert */}
      {hasDuplicates && (
        <div className="mx-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800">
          <strong>Duplicates detected:</strong> {duplicateGroups.size} file{duplicateGroups.size !== 1 ? 's have' : ' has'} identical copies.
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400">
            No files loaded
          </div>
        ) : (
          files.map((meta) => (
            <FileEntryRow
              key={meta.fileId}
              meta={meta}
              onJumpToNode={handleJumpToNode}
              onReuse={handleReuse}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
