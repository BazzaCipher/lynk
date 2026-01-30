/**
 * History Slice
 *
 * Handles undo/redo functionality:
 * - History snapshots
 * - Navigation through history
 */

import type { LynkNode } from '../../types';
import type { StateCreator, HistorySnapshot } from './types';

const MAX_HISTORY_SIZE = 50;

export interface HistorySlice {
  // State
  history: HistorySnapshot[];
  historyIndex: number;

  // Actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const createHistorySlice: StateCreator<HistorySlice> = (set, get) => ({
  // Initial state
  history: [],
  historyIndex: -1,

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();

    // Create snapshot
    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);

    // Add new snapshot
    newHistory.push(snapshot);

    // Limit history size
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex, nodes, edges } = get();

    // If this is the first undo, save current state first
    if (historyIndex === history.length - 1 || history.length === 0) {
      const currentSnapshot: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };

      // Push current state if not already in history
      const newHistory = [...history, currentSnapshot];
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
      }

      if (newHistory.length < 2) return; // Nothing to undo

      const newIndex = newHistory.length - 2;
      const snapshot = newHistory[newIndex];

      set({
        nodes: snapshot.nodes as LynkNode[],
        edges: snapshot.edges,
        history: newHistory,
        historyIndex: newIndex,
      });
      return;
    }

    if (historyIndex <= 0) return; // Nothing to undo

    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];

    set({
      nodes: snapshot.nodes as LynkNode[],
      edges: snapshot.edges,
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();

    if (historyIndex >= history.length - 1) return; // Nothing to redo

    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];

    set({
      nodes: snapshot.nodes as LynkNode[],
      edges: snapshot.edges,
      historyIndex: newIndex,
    });
  },

  canUndo: () => {
    const { history, historyIndex } = get();
    return history.length > 0 && historyIndex >= 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },
});
