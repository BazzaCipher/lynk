import { describe, it, expect } from 'vitest';
import { DEFAULT_VIEW, createImageView, createPdfView } from '../../types/view';

describe('DEFAULT_VIEW', () => {
  it('has full viewport and page target', () => {
    expect(DEFAULT_VIEW.viewport).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(DEFAULT_VIEW.target.type).toBe('page');
    expect(DEFAULT_VIEW.aspectLocked).toBe(true);
  });
});

describe('createImageView', () => {
  it('creates image view with defaults', () => {
    const view = createImageView();
    expect(view.target.type).toBe('image');
    expect(view.nodeSize).toEqual({ width: 300, height: 200 });
  });

  it('accepts custom dimensions', () => {
    const view = createImageView(500, 400);
    expect(view.nodeSize).toEqual({ width: 500, height: 400 });
  });
});

describe('createPdfView', () => {
  it('creates PDF view with defaults', () => {
    const view = createPdfView();
    expect(view.target).toEqual({ type: 'page', pageNumber: 1 });
    expect(view.nodeSize).toEqual({ width: 400, height: 300 });
  });

  it('accepts custom page and dimensions', () => {
    const view = createPdfView(3, 600, 800);
    expect(view.target).toEqual({ type: 'page', pageNumber: 3 });
    expect(view.nodeSize).toEqual({ width: 600, height: 800 });
  });
});
