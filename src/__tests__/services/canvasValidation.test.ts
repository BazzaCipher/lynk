import { describe, it, expect } from 'vitest';
import { validateNodeDataUpdate, getValidHandles, filterValidEdges } from '../../services/canvasValidation';
import type { LynkNode } from '../../types';
import type { Edge } from '@xyflow/react';

describe('validateNodeDataUpdate', () => {
  it('validates calculation precision (0-10)', () => {
    expect(validateNodeDataUpdate('calculation', { precision: 5 })).toBe(true);
    expect(validateNodeDataUpdate('calculation', { precision: -1 })).toBe(false);
    expect(validateNodeDataUpdate('calculation', { precision: 11 })).toBe(false);
  });

  it('validates extractor regions must be array', () => {
    expect(validateNodeDataUpdate('extractor', { regions: [] })).toBe(true);
    expect(validateNodeDataUpdate('extractor', { regions: 'bad' as any })).toBe(false);
  });

  it('validates display view nodeSize must be positive', () => {
    expect(validateNodeDataUpdate('display', {
      view: { nodeSize: { width: 100, height: 200 } },
    } as any)).toBe(true);
    expect(validateNodeDataUpdate('display', {
      view: { nodeSize: { width: 0, height: 200 } },
    } as any)).toBe(false);
    expect(validateNodeDataUpdate('display', {
      view: { nodeSize: { width: 100, height: -1 } },
    } as any)).toBe(false);
  });

  it('validates label must be string', () => {
    expect(validateNodeDataUpdate('label', { label: 'hello' })).toBe(true);
    expect(validateNodeDataUpdate('label', { label: 42 as any })).toBe(false);
  });

  it('returns true for unrelated updates', () => {
    expect(validateNodeDataUpdate('calculation', { label: 'test' })).toBe(true);
  });
});

describe('getValidHandles', () => {
  it('returns region handles for extractor', () => {
    const node = {
      id: 'ext', type: 'extractor', position: { x: 0, y: 0 },
      data: { label: 'e', regions: [{ id: 'r1' }, { id: 'r2' }], currentPage: 1, totalPages: 1, fileType: 'image' },
    } as LynkNode;
    const handles = getValidHandles(node);
    expect(handles.has('r1')).toBe(true);
    expect(handles.has('r2')).toBe(true);
  });

  it('returns input/output for calculation', () => {
    const node = {
      id: 'calc', type: 'calculation', position: { x: 0, y: 0 },
      data: { label: 'c', operation: 'sum', precision: 2, inputs: [] },
    } as LynkNode;
    const handles = getValidHandles(node);
    expect(handles.has('inputs')).toBe(true);
    expect(handles.has('output')).toBe(true);
  });

  it('returns input/output for label', () => {
    const node = {
      id: 'lbl', type: 'label', position: { x: 0, y: 0 },
      data: { label: 'l', format: 'string', fontSize: 'medium', alignment: 'left' },
    } as LynkNode;
    const handles = getValidHandles(node);
    expect(handles.has('input')).toBe(true);
    expect(handles.has('output')).toBe(true);
  });

  it('returns viewport handles for display node', () => {
    const node = {
      id: 'disp', type: 'display', position: { x: 0, y: 0 },
      data: { label: 'd', viewports: [{ id: 'vp1' }, { id: 'vp2' }] },
    } as LynkNode;
    const handles = getValidHandles(node);
    expect(handles.has('vp1')).toBe(true);
    expect(handles.has('vp2')).toBe(true);
  });

  it('returns subheader and entry handles for sheet node', () => {
    const node = {
      id: 'sh', type: 'sheet', position: { x: 0, y: 0 },
      data: { label: 's', subheaders: [{ id: 'sh1', entries: [{ id: 'e1' }] }] },
    } as LynkNode;
    const handles = getValidHandles(node);
    expect(handles.has('subheader-sh1')).toBe(true);
    expect(handles.has('entry-in-sh1-e1')).toBe(true);
    expect(handles.has('entry-out-sh1-e1')).toBe(true);
  });

  it('returns viewport-in for viewport node', () => {
    const node = {
      id: 'vp', type: 'viewport', position: { x: 0, y: 0 },
      data: { label: 'v', nodeSize: { width: 200, height: 150 }, aspectLocked: true },
    } as LynkNode;
    const handles = getValidHandles(node);
    expect(handles.has('viewport-in')).toBe(true);
  });
});

describe('filterValidEdges', () => {
  it('removes edges with missing source or target nodes', () => {
    const nodes: LynkNode[] = [
      { id: 'a', type: 'calculation', position: { x: 0, y: 0 }, data: { label: 'a', operation: 'sum', precision: 2, inputs: [] } } as LynkNode,
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'a', target: 'b' } as Edge,
    ];
    const { valid, removedCount } = filterValidEdges(nodes, edges);
    expect(valid).toHaveLength(0);
    expect(removedCount).toBe(1);
  });

  it('keeps edges with valid nodes', () => {
    const nodes: LynkNode[] = [
      { id: 'a', type: 'calculation', position: { x: 0, y: 0 }, data: { label: 'a', operation: 'sum', precision: 2, inputs: [] } } as LynkNode,
      { id: 'b', type: 'label', position: { x: 0, y: 0 }, data: { label: 'b', format: 'string', fontSize: 'medium', alignment: 'left' } } as LynkNode,
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'a', target: 'b', sourceHandle: 'output', targetHandle: 'input' } as Edge,
    ];
    const { valid, removedCount } = filterValidEdges(nodes, edges);
    expect(valid).toHaveLength(1);
    expect(removedCount).toBe(0);
  });

  it('removes edges with invalid target handles', () => {
    const nodes: LynkNode[] = [
      { id: 'ext', type: 'extractor', position: { x: 0, y: 0 }, data: { label: 'e', regions: [{ id: 'r1' }], currentPage: 1, totalPages: 1, fileType: 'image' } } as LynkNode,
      { id: 'calc', type: 'calculation', position: { x: 0, y: 0 }, data: { label: 'c', operation: 'sum', precision: 2, inputs: [] } } as LynkNode,
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'ext', target: 'calc', sourceHandle: 'r1', targetHandle: 'nonexistent' } as Edge,
    ];
    const { valid, removedCount } = filterValidEdges(nodes, edges);
    expect(valid).toHaveLength(0);
    expect(removedCount).toBe(1);
  });

  it('removes edges with invalid handles', () => {
    const nodes: LynkNode[] = [
      { id: 'ext', type: 'extractor', position: { x: 0, y: 0 }, data: { label: 'e', regions: [{ id: 'r1' }], currentPage: 1, totalPages: 1, fileType: 'image' } } as LynkNode,
      { id: 'calc', type: 'calculation', position: { x: 0, y: 0 }, data: { label: 'c', operation: 'sum', precision: 2, inputs: [] } } as LynkNode,
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'ext', target: 'calc', sourceHandle: 'nonexistent', targetHandle: 'inputs' } as Edge,
    ];
    const { valid, removedCount } = filterValidEdges(nodes, edges);
    expect(valid).toHaveLength(0);
    expect(removedCount).toBe(1);
  });
});
