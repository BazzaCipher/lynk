import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { CanvasState } from '../types';
import { SourceNode } from '../types';
import { defaultPipeline, type ExportedCanvas } from '../store/codecs';

// localStorage keys
export const STORAGE_KEYS = {
  CURRENT_CANVAS: 'lynk:canvas:current',
  BACKUP_CANVAS: 'lynk:canvas:backup',
  SETTINGS: 'lynk:settings',
  RECENT_FILES: 'lynk:recent-files',
} as const;

// Default auto-save interval (30 seconds)
const AUTO_SAVE_INTERVAL = 30_000;
// Debounce delay for change-triggered saves (1 second)
const DEBOUNCE_DELAY = 1_000;

export interface StoredCanvasData {
  /** Canvas state with embedded file data (base64-encoded) */
  canvas: ExportedCanvas;
  /** When the draft was saved */
  savedAt: string;
  /** Whether this is an unsaved draft vs explicitly saved file */
  isDraft: boolean;
  /** File IDs that need to be re-imported on restore (only if save exceeded quota) */
  missingFileIds: string[];
}

/**
 * Collect file IDs from source nodes
 */
function collectFileIds(canvas: CanvasState): string[] {
  const fileIds: string[] = [];
  for (const node of canvas.nodes) {
    if (SourceNode.is(node)) {
      const fileId = SourceNode.getFileId(node);
      if (fileId) {
        fileIds.push(fileId);
      }
    }
  }
  return fileIds;
}

/**
 * Encode canvas with embedded file data via the codec pipeline.
 * Falls back to stripping files if encoding fails.
 */
async function prepareForStorage(canvas: CanvasState): Promise<{ prepared: ExportedCanvas; missingFileIds: string[] }> {
  const fileIds = collectFileIds(canvas);

  try {
    const { canvas: exported } = await defaultPipeline.export(canvas);
    return { prepared: exported, missingFileIds: [] };
  } catch (err) {
    console.warn('Failed to encode files for localStorage, saving without files:', err);
    return {
      prepared: { ...canvas, embedded: undefined },
      missingFileIds: fileIds,
    };
  }
}

/**
 * Save canvas state to localStorage (with embedded file data)
 */
export async function saveToLocalStorage(canvas: CanvasState, isDraft = true): Promise<boolean> {
  try {
    const { prepared, missingFileIds } = await prepareForStorage(canvas);

    const data: StoredCanvasData = {
      canvas: prepared,
      savedAt: new Date().toISOString(),
      isDraft,
      missingFileIds,
    };

    const json = JSON.stringify(data);

    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CANVAS, json);
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        // Files too large for localStorage - save without embedded files
        console.warn('localStorage quota exceeded with files, retrying without file data');
        const fileIds = collectFileIds(canvas);
        const fallbackData: StoredCanvasData = {
          canvas: { ...canvas, embedded: undefined },
          savedAt: new Date().toISOString(),
          isDraft,
          missingFileIds: fileIds,
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_CANVAS, JSON.stringify(fallbackData));
        return true;
      }
      throw err;
    }
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
    return false;
  }
}

/**
 * Load canvas state from localStorage
 */
export function loadFromLocalStorage(): StoredCanvasData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_CANVAS);
    if (!stored) return null;
    return JSON.parse(stored) as StoredCanvasData;
  } catch (err) {
    console.warn('Failed to load from localStorage:', err);
    return null;
  }
}

/**
 * Clear the draft from localStorage (call after explicit file save)
 */
export function clearLocalStorageDraft(): void {
  try {
    // Move current to backup before clearing
    const current = localStorage.getItem(STORAGE_KEYS.CURRENT_CANVAS);
    if (current) {
      localStorage.setItem(STORAGE_KEYS.BACKUP_CANVAS, current);
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CANVAS);
  } catch (err) {
    console.warn('Failed to clear localStorage draft:', err);
  }
}

/**
 * Check if there's unsaved work in localStorage
 */
export function hasUnsavedWork(): StoredCanvasData | null {
  const stored = loadFromLocalStorage();
  if (stored?.isDraft && stored.canvas.nodes.length > 0) {
    return stored;
  }
  return null;
}

/**
 * Get localStorage usage info
 */
export function getStorageInfo(): { used: number; available: number; percentUsed: number } {
  let used = 0;
  try {
    for (const key of Object.keys(localStorage)) {
      const value = localStorage.getItem(key);
      if (value) {
        // Each character is 2 bytes in UTF-16
        used += (key.length + value.length) * 2;
      }
    }
  } catch {
    // Ignore errors
  }

  // localStorage typically has 5MB limit
  const available = 5 * 1024 * 1024;
  return {
    used,
    available,
    percentUsed: (used / available) * 100,
  };
}

/**
 * Hook to automatically sync canvas state to localStorage
 * - Debounced save on any change (1 second delay)
 * - Periodic save every 30 seconds as backup
 */
export function useLocalStorageSync(): void {
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef<string>('');

  const saveCanvas = useCallback(async () => {
    const state = useCanvasStore.getState();
    const canvas = state.exportCanvas();

    // Only save if there are changes (compare serialized state without timestamps)
    const serialized = JSON.stringify({
      nodes: canvas.nodes,
      edges: canvas.edges,
    });

    if (serialized === lastSavedRef.current) {
      return;
    }

    const success = await saveToLocalStorage(canvas, true);
    if (success) {
      lastSavedRef.current = serialized;
    }
  }, []);

  const debouncedSave = useCallback(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      saveCanvas();
    }, DEBOUNCE_DELAY);
  }, [saveCanvas]);

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = useCanvasStore.subscribe((state, prevState) => {
      // Only trigger save if nodes or edges changed
      if (state.nodes !== prevState.nodes || state.edges !== prevState.edges) {
        debouncedSave();
      }
    });

    // Set up periodic save interval
    intervalRef.current = setInterval(() => {
      saveCanvas();
    }, AUTO_SAVE_INTERVAL);

    // Initial save
    saveCanvas();

    // Cleanup
    return () => {
      unsubscribe();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [debouncedSave, saveCanvas]);
}
