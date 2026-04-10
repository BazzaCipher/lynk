import { describe, it, expect, vi } from 'vitest';

// Mock nodeRegistry
vi.mock('../../core/nodes/nodeRegistry', () => ({
  hasCapability: (type: string, cap: string) => {
    if (cap === 'isFileNode') return ['display', 'extractor'].includes(type);
    if (cap === 'canExport') return ['display', 'extractor', 'calculation', 'sheet', 'label'].includes(type);
    if (cap === 'canImport') return ['viewport', 'calculation', 'sheet', 'label'].includes(type);
    return false;
  },
}));

import { CanvasPipeline } from '../../store/codecs/pipeline';
import type { CanvasState } from '../../types';
import type { CanvasCodec, EncodeResult, DecodeResult, ValidationResult } from '../../store/codecs/types';

const minimalCanvas: CanvasState = {
  version: '1.0.0',
  metadata: { id: 'test', name: 'Test', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

function makeCodec(id: string, opts?: { warning?: string; error?: string }): CanvasCodec<unknown> {
  return {
    id,
    name: id,
    async encode(canvas: CanvasState): Promise<EncodeResult<unknown>> {
      return { canvas, embedded: {}, warnings: opts?.warning ? [opts.warning] : [] };
    },
    decode(canvas: CanvasState): DecodeResult {
      return { canvas, warnings: opts?.warning ? [opts.warning] : [] };
    },
    validate(canvas: CanvasState): ValidationResult {
      return {
        valid: !opts?.error,
        warnings: opts?.warning ? [opts.warning] : [],
        errors: opts?.error ? [opts.error] : [],
      };
    },
  };
}

describe('CanvasPipeline', () => {
  it('exports canvas through codecs', async () => {
    const pipeline = new CanvasPipeline().register(makeCodec('test'));
    const result = await pipeline.export(minimalCanvas);
    expect(result.canvas.version).toBe('1.0.0');
    expect(result.warnings).toEqual([]);
  });

  it('imports canvas through codecs', () => {
    const pipeline = new CanvasPipeline().register(makeCodec('test'));
    const result = pipeline.import(minimalCanvas);
    expect(result.canvas.version).toBe('1.0.0');
  });

  it('aggregates warnings from multiple codecs', async () => {
    const pipeline = new CanvasPipeline()
      .register(makeCodec('a', { warning: 'warn-a' }))
      .register(makeCodec('b', { warning: 'warn-b' }));
    const result = await pipeline.export(minimalCanvas);
    expect(result.warnings).toEqual(['warn-a', 'warn-b']);
  });

  it('validates canvas and aggregates errors', () => {
    const pipeline = new CanvasPipeline()
      .register(makeCodec('a', { error: 'err-a' }))
      .register(makeCodec('b'));
    const result = pipeline.validate(minimalCanvas);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('err-a');
  });

  it('validates as valid when no errors', () => {
    const pipeline = new CanvasPipeline().register(makeCodec('ok'));
    const result = pipeline.validate(minimalCanvas);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
