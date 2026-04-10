import { describe, it, expect, vi } from 'vitest';

// Mock nodeRegistry before importing categories
vi.mock('../../core/nodes/nodeRegistry', () => ({
  hasCapability: (type: string, cap: string) => {
    if (cap === 'isFileNode') return ['display', 'extractor'].includes(type);
    if (cap === 'canExport') return ['display', 'extractor', 'calculation', 'sheet', 'label'].includes(type);
    if (cap === 'canImport') return ['viewport', 'calculation', 'sheet', 'label'].includes(type);
    return false;
  },
}));

import { FileNode, SourceNode, CanExport, CanImport, Highlightable } from '../../types/categories';
import type { LynkNode } from '../../types/nodes';

function makeNode(id: string, type: string, data: Record<string, unknown> = {}): LynkNode {
  return { id, type, position: { x: 0, y: 0 }, data: { label: id, ...data } } as LynkNode;
}

describe('FileNode', () => {
  it('identifies file nodes', () => {
    expect(FileNode.is(makeNode('a', 'extractor', { fileType: 'pdf' }))).toBe(true);
    expect(FileNode.is(makeNode('a', 'display', { fileType: 'image' }))).toBe(true);
    expect(FileNode.is(makeNode('a', 'calculation'))).toBe(false);
  });

  it('gets file properties', () => {
    const node = makeNode('a', 'extractor', { fileType: 'pdf', fileId: 'f1', fileUrl: 'blob:', fileName: 'test.pdf' });
    if (FileNode.is(node)) {
      expect(FileNode.getFileId(node)).toBe('f1');
      expect(FileNode.getFileUrl(node)).toBe('blob:');
      expect(FileNode.getFileName(node)).toBe('test.pdf');
    }
  });

  it('filters file nodes', () => {
    const nodes = [
      makeNode('a', 'extractor', { fileType: 'pdf' }),
      makeNode('b', 'calculation'),
      makeNode('c', 'display', { fileType: 'image' }),
    ];
    expect(FileNode.filter(nodes)).toHaveLength(2);
  });
});

describe('SourceNode (deprecated)', () => {
  it('identifies source nodes by type list', () => {
    expect(SourceNode.is(makeNode('a', 'extractor'))).toBe(true);
    expect(SourceNode.is(makeNode('a', 'display'))).toBe(true);
    expect(SourceNode.is(makeNode('a', 'label'))).toBe(false);
  });

  it('filters source nodes', () => {
    const nodes = [makeNode('a', 'extractor'), makeNode('b', 'label')];
    expect(SourceNode.filter(nodes)).toHaveLength(1);
  });

  it('gets file properties', () => {
    const node = makeNode('a', 'extractor', { fileId: 'f1', fileUrl: 'blob:', fileName: 'test.pdf' });
    if (SourceNode.is(node)) {
      expect(SourceNode.getFileId(node)).toBe('f1');
      expect(SourceNode.getFileUrl(node)).toBe('blob:');
      expect(SourceNode.getFileName(node)).toBe('test.pdf');
    }
  });
});

describe('CanExport', () => {
  it('identifies exportable nodes', () => {
    expect(CanExport.is(makeNode('a', 'extractor'))).toBe(true);
    expect(CanExport.is(makeNode('a', 'calculation'))).toBe(true);
    expect(CanExport.is(makeNode('a', 'viewport'))).toBe(false);
    expect(CanExport.is(makeNode('a', 'group'))).toBe(false);
  });
});

describe('CanImport', () => {
  it('identifies importable nodes', () => {
    expect(CanImport.is(makeNode('a', 'viewport'))).toBe(true);
    expect(CanImport.is(makeNode('a', 'calculation'))).toBe(true);
    expect(CanImport.is(makeNode('a', 'extractor'))).toBe(false);
  });
});

describe('Highlightable', () => {
  it('constructs target ID', () => {
    expect(Highlightable.target('node-1', 'output')).toBe('node-1:output');
  });

  it('parses target ID', () => {
    expect(Highlightable.parse('node-1:output')).toEqual({ nodeId: 'node-1', handleId: 'output' });
  });

  it('returns null for invalid target', () => {
    expect(Highlightable.parse('no-colon')).toBeNull();
  });

  it('gets handles from outputs', () => {
    expect(Highlightable.getHandles({ outputs: { r1: {} as any, r2: {} as any } })).toEqual(['r1', 'r2']);
    expect(Highlightable.getHandles({})).toEqual([]);
  });

  it('matches highlighted target', () => {
    expect(Highlightable.matches('node-1:output', 'node-1', 'output')).toBe(true);
    expect(Highlightable.matches('node-1:output', 'node-1', 'input')).toBe(false);
    expect(Highlightable.matches(null, 'node-1', 'output')).toBe(false);
  });
});
