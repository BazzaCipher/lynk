import { describe, it, expect, vi } from 'vitest';
import { applyTreeLayout, applyGridLayout, applyLayout } from '../../core/layout/layoutAlgorithms';
import type { LynkNode } from '../../types';
import type { Edge } from '@xyflow/react';

// Mock nodeRegistry
vi.mock('../../core/nodes/nodeRegistry', () => ({
  hasCapability: (type: string, cap: string) => {
    if (cap === 'isFileNode') return type === 'extractor' || type === 'display';
    return false;
  },
}));

function makeNode(id: string, type: string, x = 0, y = 0): LynkNode {
  return {
    id,
    type,
    position: { x, y },
    data: { label: id },
  } as LynkNode;
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target } as Edge;
}

describe('applyTreeLayout', () => {
  it('returns same nodes for empty array', () => {
    const result = applyTreeLayout([], [], {});
    expect(result).toEqual([]);
  });

  it('places source nodes (extractor) at depth 0', () => {
    const nodes = [makeNode('ext', 'extractor'), makeNode('calc', 'calculation')];
    const edges = [edge('ext', 'calc')];
    const result = applyTreeLayout(nodes, edges);
    const ext = result.find(n => n.id === 'ext')!;
    const calc = result.find(n => n.id === 'calc')!;
    expect(ext.position.x).toBeLessThan(calc.position.x);
  });

  it('respects custom options', () => {
    const nodes = [makeNode('a', 'extractor')];
    const result = applyTreeLayout(nodes, [], { startX: 100, startY: 200 });
    expect(result.find(n => n.id === 'a')!.position).toEqual({ x: 100, y: 200 });
  });

  it('skips group nodes in layout', () => {
    const nodes = [makeNode('g', 'group'), makeNode('a', 'extractor')];
    const result = applyTreeLayout(nodes, []);
    // Group node should not be repositioned in the main layout
    expect(result.some(n => n.id === 'g')).toBe(true);
  });

  it('does not reposition child nodes', () => {
    const child = { ...makeNode('c', 'calculation'), parentId: 'g' };
    const nodes = [makeNode('g', 'group'), child as LynkNode];
    const result = applyTreeLayout(nodes, []);
    const resultChild = result.find(n => n.id === 'c')!;
    expect(resultChild.position).toEqual(child.position);
  });
});

describe('applyGridLayout', () => {
  it('arranges nodes in grid', () => {
    const nodes = Array.from({ length: 6 }, (_, i) => makeNode(`n${i}`, 'calculation'));
    const result = applyGridLayout(nodes, []);
    // Default 4 columns
    const n0 = result.find(n => n.id === 'n0')!;
    const n4 = result.find(n => n.id === 'n4')!;
    expect(n0.position.y).toBeLessThan(n4.position.y); // n4 is row 1
  });

  it('skips group and child nodes', () => {
    const group = makeNode('g', 'group');
    const child = { ...makeNode('c', 'calculation'), parentId: 'g' } as LynkNode;
    const regular = makeNode('a', 'calculation');
    const result = applyGridLayout([group, child, regular], []);
    // Only regular node should be repositioned
    const resultReg = result.find(n => n.id === 'a')!;
    expect(resultReg.position.x).toBe(50); // default startX
  });

  it('returns same for empty nodes', () => {
    expect(applyGridLayout([], [])).toEqual([]);
  });
});

describe('applyLayout', () => {
  it('delegates to tree layout', () => {
    const nodes = [makeNode('a', 'extractor')];
    const result = applyLayout(nodes, [], 'tree');
    expect(result.find(n => n.id === 'a')!.position.x).toBe(50);
  });

  it('delegates to grid layout', () => {
    const nodes = [makeNode('a', 'calculation')];
    const result = applyLayout(nodes, [], 'grid');
    expect(result.find(n => n.id === 'a')!.position.x).toBe(50);
  });

  it('returns nodes unchanged for unknown layout type', () => {
    const nodes = [makeNode('a', 'calculation', 999, 888)];
    const result = applyLayout(nodes, [], 'unknown' as any);
    expect(result[0].position).toEqual({ x: 999, y: 888 });
  });
});
