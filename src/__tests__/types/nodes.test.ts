import { describe, it, expect } from 'vitest';
import { DisplayNode, ViewportNode, ExtractorNode, CalculationNode, SheetNode, LabelNode, GroupNode } from '../../types/nodes';
import type { LynkNode } from '../../types/nodes';

function makeNode(type: string): LynkNode {
  return { id: 'test', type, position: { x: 0, y: 0 }, data: { label: 'test' } } as LynkNode;
}

describe('Node type guards', () => {
  const guards = [
    { guard: DisplayNode, type: 'display' },
    { guard: ViewportNode, type: 'viewport' },
    { guard: ExtractorNode, type: 'extractor' },
    { guard: CalculationNode, type: 'calculation' },
    { guard: SheetNode, type: 'sheet' },
    { guard: LabelNode, type: 'label' },
    { guard: GroupNode, type: 'group' },
  ];

  for (const { guard, type } of guards) {
    it(`${type}.is() returns true for matching type`, () => {
      expect(guard.is(makeNode(type))).toBe(true);
    });

    it(`${type}.is() returns false for other types`, () => {
      const other = type === 'display' ? 'label' : 'display';
      expect(guard.is(makeNode(other))).toBe(false);
    });

    it(`${type}.type is correct`, () => {
      expect(guard.type).toBe(type);
    });
  }
});
