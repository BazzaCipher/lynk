/**
 * Validation Slice
 *
 * Edge cleanup action. Validation logic is in services/canvasValidation.ts
 */

import { filterValidEdges } from '../../services/canvasValidation';
import type { StateCreator } from './types';

export interface ValidationSlice {
  cleanupInvalidEdges: () => number;
}

export const createValidationSlice: StateCreator<ValidationSlice> = (set, get) => ({
  cleanupInvalidEdges: () => {
    const { nodes, edges } = get();
    const { valid, removedCount } = filterValidEdges(nodes, edges);

    if (removedCount > 0) {
      set({ edges: valid });
      console.warn(`Cleaned up ${removedCount} invalid edge(s)`);
    }

    return removedCount;
  },
});
