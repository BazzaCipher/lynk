/**
 * File Registry Slice
 *
 * Manages reactive state for the file registry panel.
 */

import { BlobRegistry, type FileMetadata } from '../canvasPersistence';
import type { StateCreator } from './types';

export interface FileRegistrySlice {
  fileRegistryOpen: boolean;
  fileRegistrySort: { field: 'name' | 'type' | 'size' | 'date'; direction: 'asc' | 'desc' };
  fileRegistrySearch: string;
  _fileRegistryVersion: number;

  fileRegistryViewMode: 'flat' | 'hierarchy';

  toggleFileRegistry: () => void;
  setFileRegistrySort: (field: 'name' | 'type' | 'size' | 'date', direction: 'asc' | 'desc') => void;
  setFileRegistrySearch: (search: string) => void;
  setFileRegistryViewMode: (mode: 'flat' | 'hierarchy') => void;
  getRegisteredFiles: () => FileMetadata[];
  getSortedFilteredFiles: () => FileMetadata[];
  getDuplicateGroups: () => Map<string, FileMetadata[]>;
  getFilesByFolder: () => Map<string, FileMetadata[]>;
  refreshFileRegistry: () => void;
}

export const createFileRegistrySlice: StateCreator<FileRegistrySlice> = (set, get) => ({
  fileRegistryOpen: false,
  fileRegistrySort: { field: 'date', direction: 'desc' },
  fileRegistrySearch: '',
  fileRegistryViewMode: 'flat',
  _fileRegistryVersion: 0,

  toggleFileRegistry: () => {
    set({ fileRegistryOpen: !get().fileRegistryOpen });
  },

  setFileRegistrySort: (field, direction) => {
    set({ fileRegistrySort: { field, direction } });
  },

  setFileRegistrySearch: (search) => {
    set({ fileRegistrySearch: search });
  },

  setFileRegistryViewMode: (mode) => {
    set({ fileRegistryViewMode: mode });
  },

  getRegisteredFiles: () => {
    // Access version to create reactive dependency
    get()._fileRegistryVersion;
    return BlobRegistry.getAllMetadata();
  },

  getSortedFilteredFiles: () => {
    get()._fileRegistryVersion;
    const { fileRegistrySort, fileRegistrySearch } = get();
    let files = BlobRegistry.getAllMetadata();

    // Filter by search
    if (fileRegistrySearch) {
      const search = fileRegistrySearch.toLowerCase();
      files = files.filter((f) => f.fileName.toLowerCase().includes(search));
    }

    // Sort
    const { field, direction } = fileRegistrySort;
    const dir = direction === 'asc' ? 1 : -1;
    files.sort((a, b) => {
      switch (field) {
        case 'name':
          return dir * a.fileName.localeCompare(b.fileName);
        case 'type':
          return dir * a.mimeType.localeCompare(b.mimeType);
        case 'size':
          return dir * (a.size - b.size);
        case 'date':
          return dir * (a.registeredAt - b.registeredAt);
        default:
          return 0;
      }
    });

    return files;
  },

  getDuplicateGroups: () => {
    get()._fileRegistryVersion;
    const files = BlobRegistry.getAllMetadata();
    const hashMap = new Map<string, FileMetadata[]>();

    for (const file of files) {
      const group = hashMap.get(file.contentHash);
      if (group) {
        group.push(file);
      } else {
        hashMap.set(file.contentHash, [file]);
      }
    }

    // Only return groups with duplicates
    for (const [hash, group] of hashMap) {
      if (group.length <= 1) hashMap.delete(hash);
    }

    return hashMap;
  },

  getFilesByFolder: () => {
    get()._fileRegistryVersion;
    // Inline sorted/filtered files since get() doesn't expose slice methods
    const allFiles = BlobRegistry.getAllMetadata();
    const search = get().fileRegistrySearch.toLowerCase();
    const { field, direction } = get().fileRegistrySort;
    let files = search
      ? allFiles.filter((f) => f.fileName.toLowerCase().includes(search))
      : allFiles;
    files = [...files].sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name': cmp = a.fileName.localeCompare(b.fileName); break;
        case 'type': cmp = a.fileType.localeCompare(b.fileType); break;
        case 'size': cmp = a.size - b.size; break;
        case 'date': cmp = a.registeredAt - b.registeredAt; break;
      }
      return direction === 'asc' ? cmp : -cmp;
    });
    const folderMap = new Map<string, FileMetadata[]>();

    for (const file of files) {
      const key = file.folderPath || '';
      const group = folderMap.get(key);
      if (group) {
        group.push(file);
      } else {
        folderMap.set(key, [file]);
      }
    }

    return folderMap;
  },

  refreshFileRegistry: () => {
    set((state) => ({ _fileRegistryVersion: state._fileRegistryVersion + 1 }));
  },
});
