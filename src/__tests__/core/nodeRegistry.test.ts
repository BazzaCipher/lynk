import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the withErrorBoundary HOC to avoid React dependency
vi.mock('../../components/nodes/base/withErrorBoundary', () => ({
  withErrorBoundary: (component: any, _type: string) => component,
}));

import {
  registerNodeType,
  getNodeType,
  getAllNodeTypes,
  getCreatableTypes,
  getNodeTypes,
  hasCapability,
  getTypesWithCapability,
} from '../../core/nodes/nodeRegistry';

const DummyComponent = () => null;

function makeDef(type: string, overrides: Partial<Parameters<typeof registerNodeType>[0]> = {}) {
  return {
    type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon: type,
    component: DummyComponent,
    defaultData: {},
    capabilities: { canExport: false, canImport: false, isFileNode: false },
    creatable: true,
    ...overrides,
  };
}

describe('nodeRegistry', () => {
  beforeEach(() => {
    // Register fresh types for each test
    registerNodeType(makeDef('test-calc', {
      capabilities: { canExport: true, canImport: true, isFileNode: false },
      creatable: true,
    }));
    registerNodeType(makeDef('test-display', {
      capabilities: { canExport: true, canImport: false, isFileNode: true },
      creatable: true,
    }));
    registerNodeType(makeDef('test-internal', {
      capabilities: { canExport: false, canImport: false, isFileNode: false },
      creatable: false,
    }));
  });

  it('getNodeType returns registered type', () => {
    const def = getNodeType('test-calc');
    expect(def).toBeDefined();
    expect(def!.label).toBe('Test-calc');
  });

  it('getNodeType returns undefined for unknown type', () => {
    expect(getNodeType('nonexistent')).toBeUndefined();
  });

  it('getAllNodeTypes returns all registered types', () => {
    const all = getAllNodeTypes();
    const types = all.map(d => d.type);
    expect(types).toContain('test-calc');
    expect(types).toContain('test-display');
    expect(types).toContain('test-internal');
  });

  it('getCreatableTypes filters non-creatable', () => {
    const creatable = getCreatableTypes();
    const types = creatable.map(d => d.type);
    expect(types).toContain('test-calc');
    expect(types).not.toContain('test-internal');
  });

  it('getNodeTypes returns React Flow nodeTypes record', () => {
    const nodeTypes = getNodeTypes();
    expect(nodeTypes['test-calc']).toBeDefined();
    expect(nodeTypes['test-display']).toBeDefined();
  });

  it('getNodeTypes caches result', () => {
    const first = getNodeTypes();
    const second = getNodeTypes();
    expect(first).toBe(second);
  });

  it('registerNodeType invalidates cache', () => {
    const first = getNodeTypes();
    registerNodeType(makeDef('test-new'));
    const second = getNodeTypes();
    expect(first).not.toBe(second);
    expect(second['test-new']).toBeDefined();
  });

  it('hasCapability returns correct values', () => {
    expect(hasCapability('test-calc', 'canExport')).toBe(true);
    expect(hasCapability('test-calc', 'isFileNode')).toBe(false);
    expect(hasCapability('test-display', 'isFileNode')).toBe(true);
    expect(hasCapability('nonexistent', 'canExport')).toBe(false);
  });

  it('getTypesWithCapability returns matching types', () => {
    const exporters = getTypesWithCapability('canExport');
    expect(exporters).toContain('test-calc');
    expect(exporters).toContain('test-display');
    expect(exporters).not.toContain('test-internal');

    const fileNodes = getTypesWithCapability('isFileNode');
    expect(fileNodes).toContain('test-display');
    expect(fileNodes).not.toContain('test-calc');
  });
});
