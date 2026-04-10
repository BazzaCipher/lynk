import { describe, it, expect } from 'vitest';
import { CanvasStateSchema } from '../../schemas/canvas';

describe('CanvasStateSchema', () => {
  const validState = {
    version: '1.0.0',
    metadata: {
      id: 'test',
      name: 'Test Canvas',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  it('validates a minimal valid state', () => {
    const result = CanvasStateSchema.safeParse(validState);
    expect(result.success).toBe(true);
  });

  it('rejects missing version', () => {
    const { version: _, ...noVersion } = validState;
    expect(CanvasStateSchema.safeParse(noVersion).success).toBe(false);
  });

  it('rejects missing metadata', () => {
    const { metadata: _, ...noMeta } = validState;
    expect(CanvasStateSchema.safeParse(noMeta).success).toBe(false);
  });

  it('rejects missing viewport', () => {
    const { viewport: _, ...noViewport } = validState;
    expect(CanvasStateSchema.safeParse(noViewport).success).toBe(false);
  });

  it('validates a calculation node', () => {
    const state = {
      ...validState,
      nodes: [{
        id: 'node-1',
        type: 'calculation',
        position: { x: 0, y: 0 },
        data: {
          label: 'Sum',
          operation: 'sum',
          precision: 2,
          inputs: [],
        },
      }],
    };
    expect(CanvasStateSchema.safeParse(state).success).toBe(true);
  });

  it('validates a label node', () => {
    const state = {
      ...validState,
      nodes: [{
        id: 'node-1',
        type: 'label',
        position: { x: 0, y: 0 },
        data: {
          label: 'Result',
          format: 'number',
          fontSize: 'medium',
          alignment: 'left',
        },
      }],
    };
    expect(CanvasStateSchema.safeParse(state).success).toBe(true);
  });

  it('transforms legacy "text" format to "string"', () => {
    const state = {
      ...validState,
      nodes: [{
        id: 'node-1',
        type: 'label',
        position: { x: 0, y: 0 },
        data: {
          label: 'Result',
          format: 'text',
          fontSize: 'medium',
          alignment: 'left',
        },
      }],
    };
    const result = CanvasStateSchema.safeParse(state);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.nodes[0].data as any).format).toBe('string');
    }
  });

  it('validates edges', () => {
    const state = {
      ...validState,
      edges: [{
        id: 'e1',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'output',
        targetHandle: 'input',
      }],
    };
    expect(CanvasStateSchema.safeParse(state).success).toBe(true);
  });

  it('rejects invalid node type', () => {
    const state = {
      ...validState,
      nodes: [{
        id: 'node-1',
        type: 'invalid_type',
        position: { x: 0, y: 0 },
        data: { label: 'test' },
      }],
    };
    expect(CanvasStateSchema.safeParse(state).success).toBe(false);
  });

  it('validates virtual folders', () => {
    const state = {
      ...validState,
      virtualFolders: [
        { id: 'f1', name: 'Invoices', parentId: null },
        { id: 'f2', name: 'Sub', parentId: 'f1' },
      ],
    };
    expect(CanvasStateSchema.safeParse(state).success).toBe(true);
  });

  it('validates group node', () => {
    const state = {
      ...validState,
      nodes: [{
        id: 'node-1',
        type: 'group',
        position: { x: 0, y: 0 },
        data: { label: 'Group', width: 400, height: 300 },
      }],
    };
    expect(CanvasStateSchema.safeParse(state).success).toBe(true);
  });

  it('validates sheet node', () => {
    const state = {
      ...validState,
      nodes: [{
        id: 'node-1',
        type: 'sheet',
        position: { x: 0, y: 0 },
        data: {
          label: 'Sheet',
          subheaders: [{
            id: 'sh1',
            label: 'Sub',
            operation: 'sum',
            entries: [{ id: 'e1', label: 'Entry', operation: 'sum' }],
          }],
        },
      }],
    };
    expect(CanvasStateSchema.safeParse(state).success).toBe(true);
  });
});
