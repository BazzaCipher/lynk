import { useCallback } from 'react';
import { BlobRegistry } from '../store/canvasPersistence';

export interface FileUploadResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'image';
  isDuplicate: boolean;
  existingFileId?: string;
  folderPath?: string;
}

interface UseFileUploadOptions {
  onFileRegistered: (result: FileUploadResult) => void;
  allowedTypes?: ('pdf' | 'image')[];
  nodeId?: string;
}

// Recursively read all files from a directory entry
async function readEntriesRecursively(
  entry: FileSystemEntry,
  basePath: string
): Promise<{ file: File; path: string }[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject)
    );
    return [{ file, path: basePath }];
  }

  if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const allEntries: FileSystemEntry[] = [];

    // readEntries may return partial results, so loop until empty
    let batch: FileSystemEntry[];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        dirReader.readEntries(resolve, reject)
      );
      allEntries.push(...batch);
    } while (batch.length > 0);

    const results = await Promise.all(
      allEntries.map((e) =>
        readEntriesRecursively(e, basePath ? `${basePath}/${e.name}` : e.name)
      )
    );
    return results.flat();
  }

  return [];
}

export function useFileUpload({ onFileRegistered, allowedTypes = ['pdf', 'image'], nodeId }: UseFileUploadOptions) {
  const processFile = useCallback(async (file: File, folderPath?: string): Promise<FileUploadResult | null> => {
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) return null;
    if (isPdf && !allowedTypes.includes('pdf')) return null;
    if (isImage && !allowedTypes.includes('image')) return null;

    const result = await BlobRegistry.registerWithMetadata(file, nodeId, folderPath);

    return {
      fileId: result.fileId,
      fileUrl: result.blobUrl,
      fileName: file.name,
      fileType: isImage ? 'image' : 'pdf',
      isDuplicate: result.isDuplicate,
      existingFileId: result.existingFileId,
      folderPath,
    };
  }, [allowedTypes, nodeId]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Support multiple files (from webkitdirectory or multi-select)
    for (const file of Array.from(files)) {
      // webkitRelativePath gives folder structure for directory uploads
      const relativePath = (file as any).webkitRelativePath as string | undefined;
      const folderPath = relativePath
        ? relativePath.substring(0, relativePath.lastIndexOf('/')) || undefined
        : undefined;
      const result = await processFile(file, folderPath);
      if (result) onFileRegistered(result);
    }
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

  // Process DataTransferItems (supports folders via webkitGetAsEntry)
  const processDataTransferItems = useCallback(async (
    items: DataTransferItemList
  ): Promise<FileUploadResult[]> => {
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    if (entries.length === 0) return [];

    // Check if any entries are directories
    const hasDirectories = entries.some((e) => e.isDirectory);

    if (hasDirectories) {
      // Recursively read all files from all entries
      const allFiles: { file: File; path: string }[] = [];
      for (const entry of entries) {
        const files = await readEntriesRecursively(
          entry,
          entry.isDirectory ? entry.name : ''
        );
        allFiles.push(...files);
      }

      const results: FileUploadResult[] = [];
      for (const { file, path } of allFiles) {
        const folderPath = path || undefined;
        const result = await processFile(file, folderPath);
        if (result) results.push(result);
      }
      return results;
    }

    // No directories — process as regular files
    const results: FileUploadResult[] = [];
    for (const entry of entries) {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject)
        );
        const result = await processFile(file);
        if (result) results.push(result);
      }
    }
    return results;
  }, [processFile]);

  // Handle clipboard paste for images
  const handleClipboardPaste = useCallback(async (
    e: ClipboardEvent
  ): Promise<FileUploadResult[]> => {
    const items = e.clipboardData?.items;
    if (!items) return [];

    const results: FileUploadResult[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (!blob) continue;

        // Create a named file from the blob
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = item.type.split('/')[1] || 'png';
        const file = new File([blob], `Pasted Image ${timestamp}.${ext}`, {
          type: item.type,
        });

        const result = await processFile(file);
        if (result) results.push(result);
      }
    }
    return results;
  }, [processFile]);

  return {
    handleFileSelect,
    handleFileDrop,
    handleDragOver,
    processFile,
    processDataTransferItems,
    handleClipboardPaste,
  };
}
