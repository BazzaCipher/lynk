import { describe, it, expect } from 'vitest';
import { wouldCreateCycle, getTopologicalOrder, getDependentNodes } from '../../core/engine/dependencyGraph';
import type { Edge } from '@xyflow/react';

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target } as Edge;
}

describe('wouldCreateCycle', () => {
  it('detects direct cycle (A→B, B→A)', () => {
    const edges = [edge('A', 'B')];
    expect(wouldCreateCycle(edges, 'B', 'A')).toBe(true);
  });

  it('detects indirect cycle (A→B→C, C→A)', () => {
    const edges = [edge('A', 'B'), edge('B', 'C')];
    expect(wouldCreateCycle(edges, 'C', 'A')).toBe(true);
  });

  it('allows valid edges', () => {
    const edges = [edge('A', 'B')];
    expect(wouldCreateCycle(edges, 'B', 'C')).toBe(false);
  });

  it('allows first edge in graph', () => {
    expect(wouldCreateCycle([], 'A', 'B')).toBe(false);
  });

  it('does not detect cycle for parallel paths', () => {
    // A→B, A→C, add B→C (diamond, no cycle)
    const edges = [edge('A', 'B'), edge('A', 'C')];
    expect(wouldCreateCycle(edges, 'B', 'C')).toBe(false);
  });
});

describe('getTopologicalOrder', () => {
  it('returns nodes in dependency order', () => {
    const nodeIds = ['A', 'B', 'C'];
    const edges = [edge('A', 'B'), edge('B', 'C')];
    const order = getTopologicalOrder(nodeIds, edges);
    expect(order).toEqual(['A', 'B', 'C']);
  });

  it('returns null for cyclic graph', () => {
    const nodeIds = ['A', 'B', 'C'];
    const edges = [edge('A', 'B'), edge('B', 'C'), edge('C', 'A')];
    expect(getTopologicalOrder(nodeIds, edges)).toBeNull();
  });

  it('handles disconnected nodes', () => {
    const nodeIds = ['A', 'B', 'C'];
    const edges: Edge[] = [];
    const order = getTopologicalOrder(nodeIds, edges);
    expect(order).toHaveLength(3);
    expect(order).toContain('A');
    expect(order).toContain('B');
    expect(order).toContain('C');
  });

  it('handles diamond dependency', () => {
    const nodeIds = ['A', 'B', 'C', 'D'];
    const edges = [edge('A', 'B'), edge('A', 'C'), edge('B', 'D'), edge('C', 'D')];
    const order = getTopologicalOrder(nodeIds, edges)!;
    expect(order).not.toBeNull();
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('C'));
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'));
    expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'));
  });

  it('ignores edges referencing nodes not in nodeIds', () => {
    const nodeIds = ['A', 'B'];
    const edges = [edge('A', 'B'), edge('B', 'X')]; // X not in nodeIds
    const order = getTopologicalOrder(nodeIds, edges);
    expect(order).toEqual(['A', 'B']);
  });
});

describe('getDependentNodes', () => {
  it('finds direct dependents', () => {
    const edges = [edge('A', 'B'), edge('A', 'C')];
    const deps = getDependentNodes(edges, 'A');
    expect(deps).toContain('B');
    expect(deps).toContain('C');
  });

  it('finds transitive dependents', () => {
    const edges = [edge('A', 'B'), edge('B', 'C')];
    const deps = getDependentNodes(edges, 'A');
    expect(deps).toContain('B');
    expect(deps).toContain('C');
  });

  it('returns empty for leaf node', () => {
    const edges = [edge('A', 'B')];
    expect(getDependentNodes(edges, 'B')).toEqual([]);
  });

  it('does not include the source node itself', () => {
    const edges = [edge('A', 'B')];
    expect(getDependentNodes(edges, 'A')).not.toContain('A');
  });
});
