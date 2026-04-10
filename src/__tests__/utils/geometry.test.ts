import { describe, it, expect } from 'vitest';
import {
  calculateBoundingBox,
  toRelativePosition,
  toAbsolutePosition,
  applyGroupAutoFit,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  GROUP_PADDING,
  GROUP_HEADER_HEIGHT,
} from '../../utils/geometry';
import type { LynkNode } from '../../types';

function makeNode(id: string, x: number, y: number, opts?: {
  type?: string;
  parentId?: string;
  measured?: { width: number; height: number };
  data?: Record<string, unknown>;
}): LynkNode {
  return {
    id,
    type: opts?.type ?? 'calculation',
    position: { x, y },
    parentId: opts?.parentId,
    measured: opts?.measured,
    data: opts?.data ?? { label: id },
  } as LynkNode;
}

describe('calculateBoundingBox', () => {
  it('calculates bounding box with default dimensions', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 100, 50)];
    const bbox = calculateBoundingBox(nodes);
    expect(bbox.minX).toBe(0);
    expect(bbox.minY).toBe(0);
    expect(bbox.maxX).toBe(100 + DEFAULT_NODE_WIDTH);
    expect(bbox.maxY).toBe(50 + DEFAULT_NODE_HEIGHT);
  });

  it('uses measured dimensions when available', () => {
    const nodes = [makeNode('a', 10, 20, { measured: { width: 300, height: 200 } })];
    const bbox = calculateBoundingBox(nodes);
    expect(bbox.maxX).toBe(310);
    expect(bbox.maxY).toBe(220);
  });

  it('returns Infinity/-Infinity for empty array', () => {
    const bbox = calculateBoundingBox([]);
    expect(bbox.minX).toBe(Infinity);
    expect(bbox.maxX).toBe(-Infinity);
  });
});

describe('toRelativePosition', () => {
  it('converts absolute to relative', () => {
    expect(toRelativePosition({ x: 100, y: 200 }, { x: 30, y: 40 })).toEqual({ x: 70, y: 160 });
  });
});

describe('toAbsolutePosition', () => {
  it('converts relative to absolute', () => {
    expect(toAbsolutePosition({ x: 70, y: 160 }, { x: 30, y: 40 })).toEqual({ x: 100, y: 200 });
  });
});

describe('applyGroupAutoFit', () => {
  it('returns same array when no groups have children', () => {
    const nodes = [makeNode('a', 0, 0)];
    expect(applyGroupAutoFit(nodes)).toBe(nodes);
  });

  it('adjusts group to wrap children', () => {
    const group = makeNode('g', 0, 0, {
      type: 'group',
      data: { label: 'group', width: 100, height: 100 },
    });
    const child = makeNode('c', GROUP_PADDING + 50, GROUP_PADDING + GROUP_HEADER_HEIGHT + 50, {
      parentId: 'g',
      measured: { width: 100, height: 80 },
    });
    const nodes = [group, child];
    const result = applyGroupAutoFit(nodes);

    // Should have been adjusted (different from input)
    expect(result).not.toBe(nodes);
    // Group should have new width/height in data
    const updatedGroup = result.find(n => n.id === 'g')!;
    expect((updatedGroup.data as any).width).toBe(100 + GROUP_PADDING * 2);
    expect((updatedGroup.data as any).height).toBe(80 + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT);
  });

  it('skips adjustment when already fitting', () => {
    const group = makeNode('g', 0, 0, {
      type: 'group',
      data: {
        label: 'group',
        width: DEFAULT_NODE_WIDTH + GROUP_PADDING * 2,
        height: DEFAULT_NODE_HEIGHT + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT,
      },
    });
    const child = makeNode('c', GROUP_PADDING, GROUP_PADDING + GROUP_HEADER_HEIGHT, {
      parentId: 'g',
    });
    const nodes = [group, child];
    const result = applyGroupAutoFit(nodes);
    expect(result).toBe(nodes); // No change
  });
});
