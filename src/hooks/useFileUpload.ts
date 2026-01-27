import { useCallback } from 'react';
import { BlobRegistry } from '../store/canvasPersistence';

export interface FileUploadResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'image';
}

interface UseFileUploadOptions {
  onFileRegistered: (result: FileUploadResult) => void;
  allowedTypes?: ('pdf' | 'image')[];
}

export function useFileUpload({ onFileRegistered, allowedTypes = ['pdf', 'image'] }: UseFileUploadOptions) {
  const processFile = useCallback((file: File): FileUploadResult | null => {
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) return null;
    if (isPdf && !allowedTypes.includes('pdf')) return null;
    if (isImage && !allowedTypes.includes('image')) return null;

    const { fileId, blobUrl } = BlobRegistry.register(file);
    return {
      fileId,
      fileUrl: blobUrl,
      fileName: file.name,
      fileType: isImage ? 'image' : 'pdf',
    };
  }, [allowedTypes]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = processFile(file);
    if (result) onFileRegistered(result);
  }, [processFile, onFileRegistered]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const result = processFile(file);
    if (result) onFileRegistered(result);
  }, [processFile, onFileRegistered]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return { handleFileSelect, handleFileDrop, handleDragOver, processFile };
}
