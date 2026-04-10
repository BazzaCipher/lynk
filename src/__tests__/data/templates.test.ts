import { describe, it, expect } from 'vitest';
import { templates } from '../../data/templates';

describe('templates', () => {
  it('has at least one template', () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  it('each template has required fields', () => {
    for (const t of templates) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.tags.length).toBeGreaterThan(0);
      expect(t.canvas.version).toBe('1.0.0');
      expect(t.canvas.metadata.id).toBeTruthy();
      expect(t.canvas.nodes.length).toBeGreaterThan(0);
    }
  });

  it('invoice-total template has extractor, calculation, and label', () => {
    const invoice = templates.find(t => t.id === 'invoice-total')!;
    const types = invoice.canvas.nodes.map(n => n.type);
    expect(types).toContain('extractor');
    expect(types).toContain('calculation');
    expect(types).toContain('label');
  });
});
