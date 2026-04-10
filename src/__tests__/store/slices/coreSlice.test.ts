import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../core/nodes/nodeRegistry', () => ({
  hasCapability: (type: string, cap: string) => {
    if (cap === 'isFileNode') return ['display', 'extractor'].includes(type);
    if (cap === 'canExport') return ['display', 'extractor', 'calculation', 'sheet', 'label'].includes(type);
    if (cap === 'canImport') return ['viewport', 'calculation', 'sheet', 'label'].includes(type);
    return false;
  },
}));

import { createCoreSlice, generateNodeId, resetNodeIdCounter, setNodeIdCounter } from '../../../store/slices/coreSlice';
import type { LynkNode } from '../../../types';
import type { Edge } from '@xyflow/react';

// Minimal store harness for StateCreator
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
  const slice = createCoreSlice(set, get);
  Object.assign(state, slice);
  // Add extra fields that other slices would provide
  state.canvasName = 'Test';
  state.canvasId = 'test-1';
  state.lastSaved = null;
  state.virtualFolders = [];
  return state;
}

describe('generateNodeId / resetNodeIdCounter / setNodeIdCounter', () => {
  beforeEach(() => resetNodeIdCounter());

  it('generates sequential IDs', () => {
    expect(generateNodeId()).toBe('node-1');
    expect(generateNodeId()).toBe('node-2');
  });

  it('resets counter', () => {
    generateNodeId();
    resetNodeIdCounter();
    expect(generateNodeId()).toBe('node-1');
  });

  it('sets counter to specific value', () => {
    setNodeIdCounter(10);
    expect(generateNodeId()).toBe('node-11');
  });
});

describe('createCoreSlice', () => {
  beforeEach(() => resetNodeIdCounter());

  it('has initial state', () => {
    const store = createStore();
    expect(store.nodes).toEqual([]);
    expect(store.edges).toEqual([]);
    expect(store.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(store.highlightedHandle).toBeNull();
  });

  it('addNode creates a node and returns id', () => {
    const store = createStore();
    const id = store.addNode('calculation', { x: 10, y: 20 }, { label: 'Calc', operation: 'sum', precision: 2, inputs: [] });
    expect(id).toBe('node-1');
    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0].type).toBe('calculation');
    expect(store.nodes[0].position).toEqual({ x: 10, y: 20 });
  });

  it('removeNode removes node and connected edges', () => {
    const store = createStore();
    const id1 = store.addNode('label', { x: 0, y: 0 }, { label: 'A', format: 'string', fontSize: 'medium', alignment: 'left' });
    const id2 = store.addNode('label', { x: 100, y: 0 }, { label: 'B', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.edges = [{ id: 'e1', source: id1, target: id2 }];
    store.removeNode(id1);
    expect(store.nodes).toHaveLength(1);
    expect(store.edges).toHaveLength(0);
  });

  it('updateNodeData merges data', () => {
    const store = createStore();
    store.addNode('label', { x: 0, y: 0 }, { label: 'A', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.updateNodeData('node-1', { label: 'Updated' });
    expect(store.nodes[0].data.label).toBe('Updated');
  });

  it('replaceNode changes type and data', () => {
    const store = createStore();
    store.addNode('label', { x: 0, y: 0 }, { label: 'A', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.replaceNode('node-1', 'calculation', { label: 'Calc', operation: 'sum', precision: 2, inputs: [] });
    expect(store.nodes[0].type).toBe('calculation');
    expect(store.nodes[0].data.operation).toBe('sum');
  });

  it('replaceNode does nothing for non-existent node', () => {
    const store = createStore();
    store.addNode('label', { x: 0, y: 0 }, { label: 'A', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.replaceNode('nonexistent', 'calculation', { label: 'Calc' });
    expect(store.nodes[0].type).toBe('label');
  });

  it('addEdge adds edge and returns true', () => {
    const store = createStore();
    store.addNode('label', { x: 0, y: 0 }, { label: 'A', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.addNode('label', { x: 100, y: 0 }, { label: 'B', format: 'string', fontSize: 'medium', alignment: 'left' });
    const result = store.addEdge({ id: 'e1', source: 'node-1', target: 'node-2' });
    expect(result).toBe(true);
    expect(store.edges).toHaveLength(1);
  });

  it('addEdge rejects cycles', () => {
    const store = createStore();
    store.addNode('label', { x: 0, y: 0 }, { label: 'A', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.addNode('label', { x: 100, y: 0 }, { label: 'B', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.addEdge({ id: 'e1', source: 'node-1', target: 'node-2' });
    const result = store.addEdge({ id: 'e2', source: 'node-2', target: 'node-1' });
    expect(result).toBe(false);
  });

  it('removeEdge removes specific edge', () => {
    const store = createStore();
    store.edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    store.removeEdge('e1');
    expect(store.edges).toHaveLength(1);
    expect(store.edges[0].id).toBe('e2');
  });

  it('removeEdgesToTarget removes edges to specific target', () => {
    const store = createStore();
    store.edges = [
      { id: 'e1', source: 'a', target: 'b', targetHandle: 'inputs' },
      { id: 'e2', source: 'c', target: 'b', targetHandle: 'output' },
      { id: 'e3', source: 'a', target: 'd' },
    ];
    store.removeEdgesToTarget('b', 'inputs');
    expect(store.edges).toHaveLength(2);
  });

  it('removeEdgesToTarget without handle removes all to target', () => {
    const store = createStore();
    store.edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'c', target: 'b' },
      { id: 'e3', source: 'a', target: 'd' },
    ];
    store.removeEdgesToTarget('b');
    expect(store.edges).toHaveLength(1);
    expect(store.edges[0].id).toBe('e3');
  });

  it('canAddEdge checks for cycles', () => {
    const store = createStore();
    store.edges = [{ id: 'e1', source: 'a', target: 'b' }];
    expect(store.canAddEdge('b', 'a')).toBe(false);
    expect(store.canAddEdge('a', 'c')).toBe(true);
  });

  it('getCalculationOrder returns topological order', () => {
    const store = createStore();
    store.addNode('label', { x: 0, y: 0 }, { label: 'A', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.addNode('label', { x: 100, y: 0 }, { label: 'B', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.edges = [{ id: 'e1', source: 'node-1', target: 'node-2' }];
    const order = store.getCalculationOrder();
    expect(order).not.toBeNull();
    expect(order!.indexOf('node-1')).toBeLessThan(order!.indexOf('node-2'));
  });

  it('getDependents returns dependent node IDs', () => {
    const store = createStore();
    store.edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'a', target: 'c' },
    ];
    const deps = store.getDependents('a');
    expect(deps).toContain('b');
    expect(deps).toContain('c');
  });

  it('setViewport updates viewport', () => {
    const store = createStore();
    store.setViewport({ x: 10, y: 20, zoom: 2 });
    expect(store.viewport).toEqual({ x: 10, y: 20, zoom: 2 });
  });

  it('setHighlightedHandle updates handle', () => {
    const store = createStore();
    store.setHighlightedHandle('node-1:output');
    expect(store.highlightedHandle).toBe('node-1:output');
    store.setHighlightedHandle(null);
    expect(store.highlightedHandle).toBeNull();
  });

  it('updateViewportRegion updates viewport region on display node', () => {
    const store = createStore();
    store.nodes = [{
      id: 'n1',
      type: 'display',
      position: { x: 0, y: 0 },
      data: {
        label: 'Display',
        viewports: [
          { id: 'vp1', x: 0, y: 0, width: 100, height: 100 },
        ],
      },
    }] as LynkNode[];
    store.updateViewportRegion('n1', 'vp1', { width: 200 });
    expect(store.nodes[0].data.viewports[0].width).toBe(200);
  });

  it('updateViewportRegion does nothing for non-display node', () => {
    const store = createStore();
    store.nodes = [{
      id: 'n1',
      type: 'label',
      position: { x: 0, y: 0 },
      data: { label: 'Test' },
    }] as LynkNode[];
    store.updateViewportRegion('n1', 'vp1', { width: 200 });
    expect(store.nodes[0].data).toEqual({ label: 'Test' });
  });

  it('onNodesChange applies position changes', () => {
    const store = createStore();
    store.addNode('label', { x: 0, y: 0 }, { label: 'A', format: 'string', fontSize: 'medium', alignment: 'left' });
    store.onNodesChange([{ type: 'position', id: 'node-1', position: { x: 50, y: 50 } }]);
    expect(store.nodes[0].position).toEqual({ x: 50, y: 50 });
  });

  it('onNodesChange selects parent group when child is selected', () => {
    const store = createStore();
    store.nodes = [
      { id: 'group-1', type: 'group', position: { x: 0, y: 0 }, data: { label: 'G' }, selected: false } as LynkNode,
      { id: 'child-1', type: 'label', position: { x: 10, y: 10 }, data: { label: 'C' }, parentId: 'group-1', selected: false } as LynkNode,
    ];
    store.onNodesChange([{ type: 'select', id: 'child-1', selected: true }]);
    const group = store.nodes.find((n: LynkNode) => n.id === 'group-1');
    expect(group?.selected).toBe(true);
  });

  it('removeNode cleans up FileNode blob references', () => {
    const store = createStore();
    store.nodes = [{
      id: 'ext-1',
      type: 'extractor',
      position: { x: 0, y: 0 },
      data: { label: 'E', fileType: 'image', fileId: 'file-1', regions: [], currentPage: 1, totalPages: 1 },
    }] as LynkNode[];
    // Just verify it doesn't throw when removing a FileNode
    store.removeNode('ext-1');
    expect(store.nodes).toHaveLength(0);
  });
});
