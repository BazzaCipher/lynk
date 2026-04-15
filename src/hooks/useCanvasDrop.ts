import { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../store/canvasStore';
import { useToast } from '../components/ui/Toast';
import { useFileUpload, type FileUploadResult } from './useFileUpload';
import { BlobRegistry } from '../store/canvasPersistence';
import type { DuplicateResolution } from '../components/canvas/DuplicateFilesDialog';

interface PendingDrop {
  duplicates: FileUploadResult[];
  newFiles: FileUploadResult[];
  position: { x: number; y: number };
}

export function useCanvasDrop() {
  const addNode = useCanvasStore((state) => state.addNode);
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const { showToast } = useToast();
  const { screenToFlowPosition } = useReactFlow();
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  const { processFile, processDataTransferItems, handleClipboardPaste } = useFileUpload({
    onFileRegistered: () => {},
  });

  const createNodesFromResults = useCallback(
    (results: FileUploadResult[], position: { x: number; y: number }) => {
      if (results.length === 0) return;

      const VERTICAL_SPACING = 350;
      pushHistory();

      results.forEach((result, index) => {
        const nodePosition = {
          x: position.x,
          y: position.y + index * VERTICAL_SPACING,
        };

        const nodeId = addNode('extractor', nodePosition, {
          label: result.fileName,
          fileId: result.fileId,
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          fileType: result.fileType,
          currentPage: 1,
          totalPages: 1,
          regions: [],
        });

        BlobRegistry.addNodeReference(result.fileId, nodeId);
      });

      useCanvasStore.getState().refreshFileRegistry();
      showToast(`Created ${results.length} extractor node(s)`, 'success');
    },
    [addNode, pushHistory, showToast]
  );

  const handleDropResults = useCallback(
    (results: FileUploadResult[], position: { x: number; y: number }) => {
      if (results.length === 0) {
        showToast('No valid files (PDF or images only)', 'warning');
        return;
      }

      const duplicates = results.filter((r) => r.isDuplicate);
      const newFiles = results.filter((r) => !r.isDuplicate);

      if (duplicates.length > 0) {
        setPendingDrop({ duplicates, newFiles, position });
      } else {
        createNodesFromResults(results, position);
      }
    },
    [createNodesFromResults, showToast]
  );

  const resolveDuplicates = useCallback(
    (resolution: DuplicateResolution) => {
      if (!pendingDrop) return;
      const { duplicates, newFiles, position } = pendingDrop;

      const toInsert = resolution === 'insert-all'
        ? [...newFiles, ...duplicates]
        : newFiles;

      setPendingDrop(null);

      if (toInsert.length > 0) {
        createNodesFromResults(toInsert, position);
      } else {
        showToast('No new files to insert', 'info');
      }
    },
    [pendingDrop, createNodesFromResults, showToast]
  );

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();

      const dropPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // Check for internal file drag from FileRegistryPanel
      const internalFileId = event.dataTransfer.getData('application/x-lynk-file');
      if (internalFileId) {
        const meta = BlobRegistry.getMetadata(internalFileId);
        const blobUrl = BlobRegistry.getUrlFromId(internalFileId);
        if (meta && blobUrl) {
          pushHistory();
          const nodeId = addNode('extractor', dropPosition, {
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
          useCanvasStore.getState().refreshFileRegistry();
          showToast('Created extractor node', 'success');
        }
        return;
      }

      // Try folder-aware processing via DataTransferItems first
      if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
        const results = await processDataTransferItems(event.dataTransfer.items);
        if (results.length > 0) {
          handleDropResults(results, dropPosition);
          return;
        }
      }

      // Fallback to regular file processing
      const files = event.dataTransfer.files;
      if (!files || files.length === 0) return;

      const promises = Array.from(files).map((file) => processFile(file));
      const processed = await Promise.all(promises);
      const results = processed.filter((r): r is NonNullable<typeof r> => r !== null);

      handleDropResults(results, dropPosition);
    },
    [screenToFlowPosition, processFile, processDataTransferItems, handleDropResults, showToast, pushHistory, addNode]
  );

  const handleCanvasPaste = useCallback(
    async (e: ClipboardEvent) => {
      const results = await handleClipboardPaste(e);
      if (results.length === 0) return;

      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      handleDropResults(results, center);
    },
    [handleClipboardPaste, screenToFlowPosition, handleDropResults]
  );

  return {
    handleCanvasDragOver,
    handleCanvasDrop,
    handleCanvasPaste,
    pendingDrop,
    resolveDuplicates,
  };
}
