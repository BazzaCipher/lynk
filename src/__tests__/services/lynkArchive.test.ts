// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { packLynk, unpackLynk } from '../../services/lynkArchive';

describe('packLynk / unpackLynk', () => {
  const manifest = {
    formatVersion: 1 as const,
    version: '1.0.0',
    metadata: { id: 'test', name: 'Test', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
    nodes: [{ id: 'node-1', type: 'label' }],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  it('round-trips manifest without files', () => {
    const packed = packLynk({ manifest, files: new Map() });
    const result = unpackLynk(packed);
    expect(result.manifest.version).toBe('1.0.0');
    expect(result.manifest.metadata.name).toBe('Test');
    expect(result.manifest.nodes).toHaveLength(1);
    expect(result.files.size).toBe(0);
  });

  it('round-trips manifest with files', () => {
    const files = new Map<string, { meta: any; data: Uint8Array }>();
    const fileData = new Uint8Array([1, 2, 3, 4]);
    files.set('file-1', {
      meta: { filename: 'test.pdf', mimeType: 'application/pdf', size: 4 },
      data: fileData,
    });
    const packed = packLynk({ manifest, files });
    expect(packed).toBeInstanceOf(Uint8Array);
    expect(packed.length).toBeGreaterThan(0);

    const result = unpackLynk(packed);
    expect(result.manifest.files['file-1'].filename).toBe('test.pdf');
    expect(result.files.size).toBe(1);
    const restored = result.files.get('file-1')!;
    expect(Array.from(restored)).toEqual([1, 2, 3, 4]);
  });

  it('throws for invalid archive (no manifest)', () => {
    expect(() => unpackLynk(new Uint8Array([0, 0, 0]))).toThrow();
  });
});
