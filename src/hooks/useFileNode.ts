import { useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { BlobRegistry, type FileMetadata } from '../store/canvasPersistence';
import { useFileUpload, type FileUploadResult } from './useFileUpload';

interface FileNodeInitData {
  fileUrl: string;
  fileId: string;
  fileName: string;
  fileType: 'pdf' | 'image';
}

type OnFileInit = (fileData: FileNodeInitData, blobUrl: string) => void;

/**
 * Shared file registration logic for file-backed nodes (DisplayNode, ExtractorNode).
 *
 * Handles:
 * - Registering files with BlobRegistry
 * - Refreshing file registry
 * - Delegating to a node-specific `onFileInit` for type-specific setup
 *
 * @param nodeId - The node's ID
 * @param onFileInit - Callback for node-specific data initialization
 */
export function useFileNode(nodeId: string, onFileInit: OnFileInit) {
  const onFileRegistered = useCallback(
    (result: FileUploadResult) => {
      BlobRegistry.addNodeReference(result.fileId, nodeId);
      useCanvasStore.getState().refreshFileRegistry();

      onFileInit(
        {
          fileUrl: result.fileUrl,
          fileId: result.fileId,
          fileName: result.fileName,
          fileType: result.fileType,
        },
        result.fileUrl
      );
    },
    [nodeId, onFileInit]
  );

  const { handleFileSelect, handleFileDrop, handleDragOver } = useFileUpload({
    onFileRegistered,
    nodeId,
  });

  const handlePickFromRegistry = useCallback(
    (_fileId: string, blobUrl: string, meta: FileMetadata) => {
      BlobRegistry.addNodeReference(meta.fileId, nodeId);
      useCanvasStore.getState().refreshFileRegistry();

      onFileInit(
        {
          fileUrl: blobUrl,
          fileId: meta.fileId,
          fileName: meta.fileName,
          fileType: meta.fileType,
        },
        blobUrl
      );
    },
    [nodeId, onFileInit]
  );

  return {
    handleFileSelect,
    handleFileDrop,
    handleDragOver,
    handlePickFromRegistry,
  };
}
