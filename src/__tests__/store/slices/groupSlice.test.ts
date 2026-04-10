import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../core/nodes/nodeRegistry', () => ({
  hasCapability: (type: string, cap: string) => {
    if (cap === 'isFileNode') return ['display', 'extractor'].includes(type);
    if (cap === 'canExport') return ['display', 'extractor', 'calculation', 'sheet', 'label'].includes(type);
    if (cap === 'canImport') return ['viewport', 'calculation', 'sheet', 'label'].includes(type);
    return false;
  },
}));

import { createGroupSlice } from '../../../store/slices/groupSlice';
import { resetNodeIdCounter } from '../../../store/slices/coreSlice';
import type { LynkNode } from '../../../types';

function createStore() {
  let state: any = {};
  const set = (partial: any) => {
    if (typeof partial === 'function') {
      Object.assign(state, partial(state));
    } else {
      Object.assign(state, partial);
    }
  };
  const get = () => state;
  const slice = createGroupSlice(set, get);
  Object.assign(state, slice);
  state.nodes = [] as LynkNode[];
  state.edges = [] as any[];
  return state;
}

describe('createGroupSlice', () => {
  beforeEach(() => resetNodeIdCounter());

  it('getSelectedNodes returns selected nodes', () => {
    const store = createStore();
    store.nodes = [
      { id: 'n1', selected: true, type: 'label', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', selected: false, type: 'label', position: { x: 100, y: 0 }, data: { label: 'B' } },
    ] as LynkNode[];
    expect(store.getSelectedNodes()).toHaveLength(1);
    expect(store.getSelectedNodes()[0].id).toBe('n1');
  });

  it('getSelectedEdges returns selected edges', () => {
    const store = createStore();
    store.edges = [
      { id: 'e1', source: 'a', target: 'b', selected: true },
      { id: 'e2', source: 'b', target: 'c', selected: false },
    ];
    expect(store.getSelectedEdges()).toHaveLength(1);
  });

  it('clearSelection deselects all', () => {
    const store = createStore();
    store.nodes = [
      { id: 'n1', selected: true, type: 'label', position: { x: 0, y: 0 }, data: { label: 'A' } },
    ] as LynkNode[];
    store.edges = [{ id: 'e1', source: 'a', target: 'b', selected: true }];
    store.clearSelection();
    expect(store.nodes[0].selected).toBe(false);
    expect(store.edges[0].selected).toBe(false);
  });

  it('removeSelectedEdges removes selected edges', () => {
    const store = createStore();
    store.edges = [
      { id: 'e1', source: 'a', target: 'b', selected: true },
      { id: 'e2', source: 'b', target: 'c', selected: false },
    ];
    store.removeSelectedEdges();
    expect(store.edges).toHaveLength(1);
    expect(store.edges[0].id).toBe('e2');
  });

  it('createGroup returns null for fewer than 2 nodes', () => {
    const store = createStore();
    store.nodes = [
      { id: 'n1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'A' } },
    ] as LynkNode[];
    expect(store.createGroup(['n1'])).toBeNull();
  });

  it('createGroup creates a group from multiple nodes', () => {
    const store = createStore();
    store.nodes = [
      { id: 'n1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'A' }, measured: { width: 100, height: 50 } },
      { id: 'n2', type: 'label', position: { x: 200, y: 100 }, data: { label: 'B' }, measured: { width: 100, height: 50 } },
    ] as LynkNode[];
    store.edges = [];
    const groupId = store.createGroup(['n1', 'n2']);
    expect(groupId).toBeTruthy();
    const groupNode = store.nodes.find((n: LynkNode) => n.type === 'group');
    expect(groupNode).toBeTruthy();
    // Children should have parentId
    const children = store.nodes.filter((n: LynkNode) => n.parentId === groupId);
    expect(children).toHaveLength(2);
  });

  it('createGroup excludes existing group nodes', () => {
    const store = createStore();
    store.nodes = [
      { id: 'n1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'A' }, measured: { width: 100, height: 50 } },
      { id: 'n2', type: 'group', position: { x: 200, y: 100 }, data: { label: 'G' }, measured: { width: 100, height: 50 } },
    ] as LynkNode[];
    // Only 1 groupable node → returns null
    expect(store.createGroup(['n1', 'n2'])).toBeNull();
  });

  it('ungroupNodes restores absolute positions', () => {
    const store = createStore();
    store.nodes = [
      { id: 'g1', type: 'group', position: { x: 50, y: 50 }, data: { label: 'Group' } },
      { id: 'n1', type: 'label', position: { x: 10, y: 10 }, parentId: 'g1', data: { label: 'A' } },
    ] as LynkNode[];
    store.ungroupNodes('g1');
    // Group node removed
    expect(store.nodes.find((n: LynkNode) => n.id === 'g1')).toBeUndefined();
    // Child restored to absolute position
    const child = store.nodes.find((n: LynkNode) => n.id === 'n1')!;
    expect(child.position.x).toBe(60); // 50 + 10
    expect(child.position.y).toBe(60);
    expect(child.parentId).toBeUndefined();
  });

  it('ungroupNodes does nothing for non-existent group', () => {
    const store = createStore();
    store.nodes = [
      { id: 'n1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'A' } },
    ] as LynkNode[];
    store.ungroupNodes('nonexistent');
    expect(store.nodes).toHaveLength(1);
  });

  it('removeSelectedNodes cleans up FileNode blob references', () => {
    const store = createStore();
    store.nodes = [
      { id: 'ext1', type: 'extractor', position: { x: 0, y: 0 }, data: { label: 'E', fileType: 'image', fileId: 'f1', regions: [], currentPage: 1, totalPages: 1 }, selected: true },
      { id: 'n2', type: 'label', position: { x: 200, y: 200 }, data: { label: 'B' }, selected: false },
    ] as LynkNode[];
    store.edges = [];
    store.removeSelectedNodes();
    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0].id).toBe('n2');
  });

  it('removeSelectedNodes removes selected and their children', () => {
    const store = createStore();
    store.nodes = [
      { id: 'g1', type: 'group', position: { x: 0, y: 0 }, data: { label: 'G' }, selected: true },
      { id: 'n1', type: 'label', position: { x: 10, y: 10 }, parentId: 'g1', data: { label: 'A' }, selected: false },
      { id: 'n2', type: 'label', position: { x: 200, y: 200 }, data: { label: 'B' }, selected: false },
    ] as LynkNode[];
    store.edges = [{ id: 'e1', source: 'n1', target: 'n2' }];
    store.removeSelectedNodes();
    // Group and child removed, n2 remains
    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0].id).toBe('n2');
    // Edge involving removed node also removed
    expect(store.edges).toHaveLength(0);
  });
});
