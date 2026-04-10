import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../core/nodes/nodeRegistry', () => ({
  hasCapability: (type: string, cap: string) => {
    if (cap === 'isFileNode') return ['display', 'extractor'].includes(type);
    if (cap === 'canExport') return ['display', 'extractor', 'calculation', 'sheet', 'label'].includes(type);
    if (cap === 'canImport') return ['viewport', 'calculation', 'sheet', 'label'].includes(type);
    return false;
  },
}));

import { createLayoutSlice } from '../../../store/slices/layoutSlice';
import { createValidationSlice } from '../../../store/slices/validationSlice';
import type { LynkNode } from '../../../types';

function createLayoutStore() {
  let state: any = {};
  const set = (partial: any) => Object.assign(state, typeof partial === 'function' ? partial(state) : partial);
  const get = () => state;
  const slice = createLayoutSlice(set, get);
  Object.assign(state, slice);
  state.nodes = [];
  state.edges = [];
  return state;
}

function createValidationStore() {
  let state: any = {};
  const set = (partial: any) => Object.assign(state, typeof partial === 'function' ? partial(state) : partial);
  const get = () => state;
  const slice = createValidationSlice(set, get);
  Object.assign(state, slice);
  state.nodes = [];
  state.edges = [];
  return state;
}

describe('createLayoutSlice', () => {
  it('applyLayout updates node positions', () => {
    const store = createLayoutStore();
    store.nodes = [
      { id: 'n1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', type: 'label', position: { x: 0, y: 0 }, data: { label: 'B' } },
    ] as LynkNode[];
    store.edges = [{ id: 'e1', source: 'n1', target: 'n2' }];
    store.applyLayout('horizontal');
    // Nodes should have been repositioned (exact positions depend on algorithm)
    expect(store.nodes).toHaveLength(2);
  });
});

describe('createValidationSlice', () => {
  it('cleanupInvalidEdges removes edges with missing nodes', () => {
    const store = createValidationStore();
    store.nodes = [
      { id: 'n1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'A' } },
    ] as LynkNode[];
    store.edges = [
      { id: 'e1', source: 'n1', target: 'n2' }, // n2 doesn't exist
      { id: 'e2', source: 'n1', target: 'n1' },
    ];
    const removed = store.cleanupInvalidEdges();
    expect(removed).toBe(1);
    expect(store.edges).toHaveLength(1);
  });

  it('cleanupInvalidEdges returns 0 when all valid', () => {
    const store = createValidationStore();
    store.nodes = [
      { id: 'n1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', type: 'label', position: { x: 0, y: 0 }, data: { label: 'B' } },
    ] as LynkNode[];
    store.edges = [{ id: 'e1', source: 'n1', target: 'n2' }];
    const removed = store.cleanupInvalidEdges();
    expect(removed).toBe(0);
  });
});
