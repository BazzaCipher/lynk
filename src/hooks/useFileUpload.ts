import { useCallback } from 'react';
import { BlobRegistry } from '../store/canvasPersistence';

export interface FileUploadResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'image';
  isDuplicate: boolean;
  existingFileId?: string;
}

interface UseFileUploadOptions {
  onFileRegistered: (result: FileUploadResult) => void;
  allowedTypes?: ('pdf' | 'image')[];
  nodeId?: string;
}

export function useFileUpload({ onFileRegistered, allowedTypes = ['pdf', 'image'], nodeId }: UseFileUploadOptions) {
  const processFile = useCallback(async (file: File): Promise<FileUploadResult | null> => {
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) return null;
    if (isPdf && !allowedTypes.includes('pdf')) return null;
    if (isImage && !allowedTypes.includes('image')) return null;

    const result = await BlobRegistry.registerWithMetadata(file, nodeId);

    return {
      fileId: result.fileId,
      fileUrl: result.blobUrl,
      fileName: file.name,
      fileType: isImage ? 'image' : 'pdf',
      isDuplicate: result.isDuplicate,
      existingFileId: result.existingFileId,
    };
  }, [allowedTypes, nodeId]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await processFile(file);
    if (result) onFileRegistered(result);
  }, [processFile, onFileRegistered]);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const result = await processFile(file);
    if (result) onFileRegistered(result);
  }, [processFile, onFileRegistered]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return { handleFileSelect, handleFileDrop, handleDragOver, processFile };
}
