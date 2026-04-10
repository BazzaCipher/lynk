import { describe, it, expect } from 'vitest';
import { generateId } from '../../utils/id';

describe('generateId', () => {
  it('starts with the given prefix', () => {
    expect(generateId('test')).toMatch(/^test-/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('x')));
    expect(ids.size).toBe(100);
  });

  it('contains timestamp and random parts', () => {
    const id = generateId('node');
    const parts = id.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });
});
