/**
 * Layout Slice
 *
 * Handles layout algorithm application
 */

import { applyLayout, type LayoutType } from '../../core/layout/layoutAlgorithms';
import type { StateCreator } from './types';

export interface LayoutSlice {
  applyLayout: (layoutType: LayoutType) => void;
}

export const createLayoutSlice: StateCreator<LayoutSlice> = (set, get) => ({
  applyLayout: (layoutType) => {
    const { nodes, edges } = get();
    const newNodes = applyLayout(nodes, edges, layoutType);
    set({ nodes: newNodes });
  },
});
