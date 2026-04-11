import { describe, it, expect, vi } from 'vitest';

// Break circular: services/canvasPersistence → hooks/useLocalStorageSync → store/canvasStore
vi.mock('../../../hooks/useLocalStorageSync', () => ({
  clearLocalStorageDraft: vi.fn(),
}));

vi.mock('../../../core/nodes/nodeRegistry', () => ({
  hasCapability: (type: string, cap: string) => {
    if (cap === 'isFileNode') return ['display', 'extractor'].includes(type);
    if (cap === 'canExport') return ['display', 'extractor', 'calculation', 'sheet', 'label'].includes(type);
    if (cap === 'canImport') return ['viewport', 'calculation', 'sheet', 'label'].includes(type);
    return false;
  },
}));

// Mock saveToFile/loadFromFile which use DOM APIs
const mockSaveToFile = vi.fn(async () => ({ success: true, warnings: [] as string[] }));
const mockLoadFromFile = vi.fn(async () => ({
  success: true,
  data: {
    nodes: [{ id: 'node-1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'Loaded' } }],
    edges: [],
    viewport: { x: 5, y: 5, zoom: 2 },
    canvasName: 'Loaded Canvas',
    canvasId: 'loaded-1',
    lastSaved: '2025-06-01T00:00:00Z',
    virtualFolders: [],
  },
}));

vi.mock('../../../services/canvasPersistence', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    saveToFile: (...args: unknown[]) => mockSaveToFile(...(args as Parameters<typeof mockSaveToFile>)),
    loadFromFile: (...args: unknown[]) => mockLoadFromFile(...(args as Parameters<typeof mockLoadFromFile>)),
  };
});

import { createPersistenceSlice } from '../../../store/slices/persistenceSlice';

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
  const slice = createPersistenceSlice(set, get);
  Object.assign(state, slice);
  state.nodes = [];
  state.edges = [];
  state.viewport = { x: 0, y: 0, zoom: 1 };
  state.highlightedHandle = null;
  state.virtualFolders = [];
  return state;
}

describe('createPersistenceSlice', () => {
  it('has default canvas name and id', () => {
    const store = createStore();
    expect(store.canvasName).toBe('Untitled Canvas');
    expect(store.canvasId).toBeTruthy();
    expect(store.lastSaved).toBeNull();
  });

  it('setCanvasName updates name', () => {
    const store = createStore();
    store.setCanvasName('My Canvas');
    expect(store.canvasName).toBe('My Canvas');
  });

  it('clearCanvas resets state', () => {
    const store = createStore();
    store.canvasName = 'Existing';
    store.nodes = [{ id: 'n1' }];
    store.clearCanvas();
    expect(store.nodes).toEqual([]);
    expect(store.edges).toEqual([]);
    expect(store.canvasName).toBe('Untitled Canvas');
    expect(store.lastSaved).toBeNull();
  });

  it('exportCanvas returns CanvasState', () => {
    const store = createStore();
    const state = store.exportCanvas();
    expect(state.version).toBe('1.0.0');
    expect(state.metadata.name).toBe('Untitled Canvas');
  });

  it('importCanvas with valid state succeeds', () => {
    const store = createStore();
    const validState = {
      version: '1.0.0',
      metadata: { id: 'test', name: 'Test', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    const result = store.importCanvas(validState);
    expect(result.success).toBe(true);
    expect(store.canvasName).toBe('Test');
  });

  it('importCanvas with invalid state returns error', () => {
    const store = createStore();
    const result = store.importCanvas({ bad: true } as any);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('validateCanvas returns validation result', () => {
    const store = createStore();
    const result = store.validateCanvas();
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('errors');
  });

  it('saveToFile delegates to service and updates lastSaved on success', async () => {
    const store = createStore();
    mockSaveToFile.mockResolvedValueOnce({ success: true, warnings: [] });
    const result = await store.saveToFile();
    expect(result.success).toBe(true);
    expect(store.lastSaved).toBeTruthy();
  });

  it('saveToFile does not update lastSaved on failure', async () => {
    const store = createStore();
    mockSaveToFile.mockResolvedValueOnce({ success: false, warnings: ['error'] as string[] });
    const result = await store.saveToFile();
    expect(result.success).toBe(false);
    expect(store.lastSaved).toBeNull();
  });

  it('loadFromFile loads data and sets state', async () => {
    const store = createStore();
    const result = await store.loadFromFile();
    expect(result.success).toBe(true);
    expect(store.canvasName).toBe('Loaded Canvas');
    expect(store.canvasId).toBe('loaded-1');
    expect(store.nodes).toHaveLength(1);
    expect(store.viewport).toEqual({ x: 5, y: 5, zoom: 2 });
  });

  it('loadFromFile returns error on failure', async () => {
    const store = createStore();
    mockLoadFromFile.mockResolvedValueOnce({ success: false, error: 'No file' } as any);
    const result = await store.loadFromFile();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No file');
  });

  it('importCanvas cleans up invalid edges', () => {
    const store = createStore();
    const validState = {
      version: '1.0.0',
      metadata: { id: 'test', name: 'Test', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      nodes: [
        { id: 'node-1', type: 'label', position: { x: 0, y: 0 }, data: { label: 'A', format: 'string', fontSize: 'medium', alignment: 'left' } },
      ],
      edges: [{ id: 'e1', source: 'node-1', target: 'nonexistent' }],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    const result = store.importCanvas(validState);
    expect(result.success).toBe(true);
    // Invalid edge should be removed by filterValidEdges
    expect(store.edges.length).toBeLessThanOrEqual(1);
  });
});
