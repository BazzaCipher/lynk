import { useState, useCallback, useMemo } from 'react';
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

// Tree node structure for folder hierarchy
interface FolderTreeNode {
  name: string;
  path: string;
  children: Map<string, FolderTreeNode>;
  files: FileMetadata[];
}

function buildFolderTree(files: FileMetadata[]): FolderTreeNode {
  const root: FolderTreeNode = { name: '', path: '', children: new Map(), files: [] };

  for (const file of files) {
    if (!file.folderPath) {
      root.files.push(file);
      continue;
    }

    const segments = file.folderPath.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!current.children.has(seg)) {
        current.children.set(seg, {
          name: seg,
          path: segments.slice(0, i + 1).join('/'),
          children: new Map(),
          files: [],
        });
      }
      current = current.children.get(seg)!;
    }

    current.files.push(file);
  }

  return root;
}

function countFilesInTree(node: FolderTreeNode): number {
  let count = node.files.length;
  for (const child of node.children.values()) {
    count += countFilesInTree(child);
  }
  return count;
}

function FolderNode({
  node,
  depth,
  onJumpToNode,
  onReuse,
  onDelete,
}: {
  node: FolderTreeNode;
  depth: number;
  onJumpToNode: (nodeId: string) => void;
  onReuse: (meta: FileMetadata) => void;
  onDelete: (fileId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalFiles = countFilesInTree(node);
  const sortedChildren = Array.from(node.children.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-50 text-left"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5 text-amber-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          {expanded ? (
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H4a1 1 0 00-1 1l-1 6V6z" />
          ) : (
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          )}
        </svg>
        <span className="text-xs font-medium text-gray-700 truncate flex-1">
          {node.name}
        </span>
        <span className="text-[10px] text-gray-400">{totalFiles}</span>
      </button>
      {expanded && (
        <div>
          {sortedChildren.map((child) => (
            <FolderNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onJumpToNode={onJumpToNode}
              onReuse={onReuse}
              onDelete={onDelete}
            />
          ))}
          {node.files.map((meta) => (
            <div key={meta.fileId} style={{ paddingLeft: `${depth * 12}px` }}>
              <FileEntryRow
                meta={meta}
                onJumpToNode={onJumpToNode}
                onReuse={onReuse}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderTreeView({
  files,
  onJumpToNode,
  onReuse,
  onDelete,
}: {
  files: FileMetadata[];
  onJumpToNode: (nodeId: string) => void;
  onReuse: (meta: FileMetadata) => void;
  onDelete: (fileId: string) => void;
}) {
  const tree = useMemo(() => buildFolderTree(files), [files]);

  const sortedChildren = Array.from(tree.children.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div>
      {/* Root-level folders */}
      {sortedChildren.map((child) => (
        <FolderNode
          key={child.path}
          node={child}
          depth={0}
          onJumpToNode={onJumpToNode}
          onReuse={onReuse}
          onDelete={onDelete}
        />
      ))}
      {/* Root-level files (no folder) */}
      {tree.files.length > 0 && (
        <div>
          {sortedChildren.length > 0 && tree.files.length > 0 && (
            <div className="px-2 py-1 text-[10px] text-gray-400 font-medium border-t border-gray-100">
              Ungrouped
            </div>
          )}
          {tree.files.map((meta) => (
            <FileEntryRow
              key={meta.fileId}
              meta={meta}
              onJumpToNode={onJumpToNode}
              onReuse={onReuse}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
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
  const fileRegistryViewMode = useCanvasStore((s) => s.fileRegistryViewMode);
  const setFileRegistryViewMode = useCanvasStore((s) => s.setFileRegistryViewMode);
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
        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded p-0.5">
            <button
              onClick={() => setFileRegistryViewMode('flat')}
              className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                fileRegistryViewMode === 'flat'
                  ? 'bg-white shadow-sm text-gray-700 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Flat list view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setFileRegistryViewMode('hierarchy')}
              className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                fileRegistryViewMode === 'hierarchy'
                  ? 'bg-white shadow-sm text-gray-700 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Folder hierarchy view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            </button>
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
        ) : fileRegistryViewMode === 'hierarchy' ? (
          <FolderTreeView
            files={files}
            onJumpToNode={handleJumpToNode}
            onReuse={handleReuse}
            onDelete={handleDelete}
          />
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
