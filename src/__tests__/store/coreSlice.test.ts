import { describe, it, expect } from 'vitest';
import { generateNodeId, resetNodeIdCounter, setNodeIdCounter } from '../../store/slices/coreSlice';

describe('generateNodeId', () => {
  it('generates sequential IDs', () => {
    resetNodeIdCounter(0);
    expect(generateNodeId()).toBe('node-1');
    expect(generateNodeId()).toBe('node-2');
    expect(generateNodeId()).toBe('node-3');
  });
});

describe('resetNodeIdCounter', () => {
  it('resets to 0 by default', () => {
    generateNodeId(); // increment
    resetNodeIdCounter();
    expect(generateNodeId()).toBe('node-1');
  });

  it('resets to custom value', () => {
    resetNodeIdCounter(10);
    expect(generateNodeId()).toBe('node-11');
  });
});

describe('setNodeIdCounter', () => {
  it('sets counter to specific value', () => {
    setNodeIdCounter(100);
    expect(generateNodeId()).toBe('node-101');
  });
});
