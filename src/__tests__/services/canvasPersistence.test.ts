import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nodeRegistry
vi.mock('../../core/nodes/nodeRegistry', () => ({
  hasCapability: (type: string, cap: string) => {
    if (cap === 'isFileNode') return ['display', 'extractor'].includes(type);
    if (cap === 'canExport') return ['display', 'extractor', 'calculation', 'sheet', 'label'].includes(type);
    if (cap === 'canImport') return ['viewport', 'calculation', 'sheet', 'label'].includes(type);
    return false;
  },
}));

vi.mock('../../hooks/useLocalStorageSync', () => ({
  clearLocalStorageDraft: vi.fn(),
}));

const mockPackLynk = vi.fn(() => new Uint8Array([1, 2, 3]));
const mockUnpackLynk = vi.fn(() => ({
  manifest: {
    formatVersion: 1,
    version: '1.0.0',
    metadata: { id: 'arc-1', name: 'Archive Canvas', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
    nodes: [
      { id: 'node-3', type: 'label', position: { x: 0, y: 0 }, data: { label: 'L', format: 'string', fontSize: 'medium', alignment: 'left' } },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    virtualFolders: [],
    files: {},
  },
  files: new Map(),
}));

vi.mock('../../services/lynkArchive', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packLynk: (...args: any[]) => (mockPackLynk as (...a: any[]) => any)(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unpackLynk: (...args: any[]) => (mockUnpackLynk as (...a: any[]) => any)(...args),
}));

import { exportCanvas, importCanvas, validateCanvas, saveToFile, loadFromFile } from '../../services/canvasPersistence';
import { clearLocalStorageDraft } from '../../hooks/useLocalStorageSync';

describe('exportCanvas', () => {
  it('creates a CanvasState with version and metadata', () => {
    const data = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      canvasName: 'Test Canvas',
      canvasId: 'canvas-1',
      lastSaved: '2025-01-01T00:00:00.000Z',
    };
    const state = exportCanvas(data);
    expect(state.version).toBe('1.0.0');
    expect(state.metadata.id).toBe('canvas-1');
    expect(state.metadata.name).toBe('Test Canvas');
    expect(state.metadata.createdAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('uses current time when lastSaved is null', () => {
    const data = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      canvasName: 'New',
      canvasId: 'c1',
      lastSaved: null,
    };
    const state = exportCanvas(data);
    expect(new Date(state.metadata.createdAt).getFullYear()).toBeGreaterThanOrEqual(2025);
  });
});

describe('importCanvas', () => {
  const validState = {
    version: '1.0.0',
    metadata: { id: 'test', name: 'Test', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  it('imports valid canvas state', () => {
    const result = importCanvas(validState);
    expect(result.success).toBe(true);
    expect(result.data?.canvasName).toBe('Test');
  });

  it('rejects invalid canvas state', () => {
    const result = importCanvas({ bad: true } as any);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid canvas file');
  });

  it('sets node ID counter from highest node ID', () => {
    const state = {
      ...validState,
      nodes: [
        { id: 'node-5', type: 'calculation', position: { x: 0, y: 0 }, data: { label: 'a', operation: 'sum', precision: 2, inputs: [] } },
        { id: 'node-10', type: 'label', position: { x: 0, y: 0 }, data: { label: 'b', format: 'string', fontSize: 'medium', alignment: 'left' } },
      ],
    };
    const result = importCanvas(state as any);
    expect(result.success).toBe(true);
  });

  it('handles nodes with non-standard IDs', () => {
    const state = {
      ...validState,
      nodes: [
        { id: 'custom-id', type: 'label', position: { x: 0, y: 0 }, data: { label: 'a', format: 'string', fontSize: 'medium', alignment: 'left' } },
      ],
    };
    const result = importCanvas(state as any);
    expect(result.success).toBe(true);
  });
});

describe('validateCanvas', () => {
  it('validates exportable canvas data', () => {
    const data = {
      nodes: [] as any[],
      edges: [] as any[],
      viewport: { x: 0, y: 0, zoom: 1 },
      canvasName: 'Test',
      canvasId: 'c1',
      lastSaved: '2025-01-01T00:00:00Z',
    };
    const result = validateCanvas(data);
    expect(result.valid).toBe(true);
  });
});

describe('saveToFile', () => {
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClick = vi.fn();
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    } as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    mockPackLynk.mockReturnValue(new Uint8Array([1, 2, 3]));
  });

  it('saves canvas and triggers download', async () => {
    const result = await saveToFile({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      canvasName: 'Test',
      canvasId: 'c1',
      lastSaved: null,
    });
    expect(result.success).toBe(true);
    expect(mockClick).toHaveBeenCalled();
    expect(clearLocalStorageDraft).toHaveBeenCalled();
  });

  it('calls packLynk and creates download link', async () => {
    const result = await saveToFile({
      nodes: [
        { id: 'node-1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'L', format: 'string', fontSize: 'medium', alignment: 'left' } },
      ] as any[],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      canvasName: 'My Canvas',
      canvasId: 'c1',
      lastSaved: null,
    });
    expect(result.success).toBe(true);
    expect(mockPackLynk).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});

describe('loadFromFile', () => {
  it('loads a .lynk archive with files and restores blob references', async () => {
    // Set up unpackLynk to return files
    mockUnpackLynk.mockReturnValueOnce({
      manifest: {
        formatVersion: 1,
        version: '1.0.0',
        metadata: { id: 'arc-2', name: 'With Files', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
        nodes: [
          { id: 'node-1', type: 'extractor', position: { x: 0, y: 0 }, data: { label: 'E', fileType: 'image', fileId: 'file-1', regions: [], currentPage: 1, totalPages: 1 } },
        ] as any[],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        virtualFolders: [],
        files: {
          'file-1': { filename: 'test.png', mimeType: 'image/png', size: 100 },
        },
      },
      files: new Map([['file-1', new Uint8Array([1, 2, 3])]]),
    });

    const mockInput = {
      type: '',
      accept: '',
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:restored');

    const promise = loadFromFile();
    const file = new File([new Uint8Array([1, 2, 3])], 'test.lynk', { type: 'application/octet-stream' });
    Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer) });
    await mockInput.onchange({ target: { files: [file] } });

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.data?.canvasName).toBe('With Files');
    // The node should have fileUrl restored
    const extNode = result.data?.nodes.find((n: any) => n.id === 'node-1');
    expect(extNode?.data.fileUrl).toBe('blob:restored');
  });

  it('loads a .lynk archive file', async () => {
    const mockInput = {
      type: '',
      accept: '',
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:restored');

    const promise = loadFromFile();

    // Simulate file selection with .lynk file
    const file = new File([new Uint8Array([1, 2, 3])], 'test.lynk', { type: 'application/octet-stream' });
    Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer) });
    const event = { target: { files: [file] } };
    await mockInput.onchange(event);

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.data?.canvasName).toBe('Archive Canvas');
  });

  it('loads a legacy .lynk.json file', async () => {
    const mockInput = {
      type: '',
      accept: '',
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);

    const validState = {
      version: '1.0.0',
      metadata: { id: 'json-1', name: 'JSON Canvas', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    const file = new File([JSON.stringify(validState)], 'test.lynk.json', { type: 'application/json' });
    const promise = loadFromFile();
    const event = { target: { files: [file] } };
    await mockInput.onchange(event);

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.data?.canvasName).toBe('JSON Canvas');
  });

  it('returns error when no file selected', async () => {
    const mockInput = {
      type: '',
      accept: '',
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);

    const promise = loadFromFile();
    await mockInput.onchange({ target: { files: [] } });

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('No file selected');
  });

  it('returns error on cancel', async () => {
    const mockInput = {
      type: '',
      accept: '',
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);

    const promise = loadFromFile();
    mockInput.oncancel();

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('File selection cancelled');
  });

  it('returns error for unparseable file', async () => {
    const mockInput = {
      type: '',
      accept: '',
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);

    const file = new File(['not json'], 'test.json', { type: 'application/json' });
    const promise = loadFromFile();
    await mockInput.onchange({ target: { files: [file] } });

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to parse file');
  });
});
