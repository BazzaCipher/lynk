import { describe, it, expect } from 'vitest';
import { getSuggestions } from '../../utils/suggestions';
import type { LynkNode } from '../../types';
import type { Edge } from '@xyflow/react';

function makeNode(id: string, type: string, data?: Record<string, unknown>): LynkNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id, ...data },
  } as LynkNode;
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target } as Edge;
}

describe('getSuggestions', () => {
  it('returns empty for single node', () => {
    expect(getSuggestions([makeNode('a', 'extractor', { regions: [] })], [])).toEqual([]);
  });

  it('suggests connecting when multiple nodes but no edges', () => {
    const nodes = [makeNode('a', 'extractor', { regions: [] }), makeNode('b', 'calculation')];
    const suggestions = getSuggestions(nodes, []);
    expect(suggestions.some(s => s.id === 'connect-nodes')).toBe(true);
  });

  it('suggests calculation when extractor has regions but no calculation', () => {
    const nodes = [
      makeNode('a', 'extractor', { regions: [{ id: 'r1' }] }),
    ];
    const suggestions = getSuggestions(nodes, []);
    expect(suggestions.some(s => s.id === 'add-calculation')).toBe(true);
  });

  it('suggests label when extractor has regions but no label', () => {
    const nodes = [
      makeNode('a', 'extractor', { regions: [{ id: 'r1' }] }),
    ];
    const suggestions = getSuggestions(nodes, []);
    expect(suggestions.some(s => s.id === 'add-label')).toBe(true);
  });

  it('does not suggest calculation when one exists', () => {
    const nodes = [
      makeNode('a', 'extractor', { regions: [{ id: 'r1' }] }),
      makeNode('b', 'calculation', { operation: 'sum', precision: 2, inputs: [] }),
    ];
    const suggestions = getSuggestions(nodes, []);
    expect(suggestions.some(s => s.id === 'add-calculation')).toBe(false);
  });

  it('suggests sheet for multiple extractors', () => {
    const nodes = [
      makeNode('a', 'extractor', { regions: [] }),
      makeNode('b', 'extractor', { regions: [] }),
    ];
    const suggestions = getSuggestions(nodes, []);
    expect(suggestions.some(s => s.id === 'add-sheet')).toBe(true);
  });

  it('suggests label for calc with result but no downstream label', () => {
    const nodes = [
      makeNode('a', 'calculation', { operation: 'sum', precision: 2, inputs: [], result: { value: 42, dataType: 'number' } }),
    ];
    const suggestions = getSuggestions(nodes, []);
    expect(suggestions.some(s => s.id === 'label-for-calc')).toBe(true);
  });

  it('does not suggest label-for-calc when label is connected downstream', () => {
    const nodes = [
      makeNode('a', 'calculation', { operation: 'sum', precision: 2, inputs: [], result: { value: 42, dataType: 'number' } }),
      makeNode('b', 'label', { label: 'Result', format: 'number', fontSize: 'medium', alignment: 'left' }),
    ];
    const edges = [makeEdge('a', 'b')];
    const suggestions = getSuggestions(nodes, edges);
    expect(suggestions.some(s => s.id === 'label-for-calc')).toBe(false);
  });
});
