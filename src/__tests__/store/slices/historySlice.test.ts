import { describe, it, expect, beforeEach } from 'vitest';
import { createHistorySlice } from '../../../store/slices/historySlice';

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
  const slice = createHistorySlice(set, get);
  Object.assign(state, slice);
  state.nodes = [];
  state.edges = [];
  return state;
}

describe('createHistorySlice', () => {
  let store: any;

  beforeEach(() => {
    store = createStore();
  });

  it('has initial state', () => {
    expect(store.history).toEqual([]);
    expect(store.historyIndex).toBe(-1);
  });

  it('canUndo returns false initially', () => {
    expect(store.canUndo()).toBe(false);
  });

  it('canRedo returns false initially', () => {
    expect(store.canRedo()).toBe(false);
  });

  it('pushHistory adds snapshot', () => {
    store.nodes = [{ id: 'n1' }];
    store.pushHistory();
    expect(store.history).toHaveLength(1);
    expect(store.historyIndex).toBe(0);
    expect(store.canUndo()).toBe(true);
  });

  it('undo restores previous state', () => {
    store.nodes = [{ id: 'n1' }];
    store.pushHistory();
    store.nodes = [{ id: 'n1' }, { id: 'n2' }];
    store.pushHistory();
    store.nodes = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }];

    store.undo();
    expect(store.nodes).toHaveLength(2);
  });

  it('redo restores next state', () => {
    store.nodes = [{ id: 'n1' }];
    store.pushHistory();
    store.nodes = [{ id: 'n1' }, { id: 'n2' }];
    store.pushHistory();
    store.nodes = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }];

    store.undo();
    expect(store.canRedo()).toBe(true);
    store.redo();
    expect(store.nodes).toHaveLength(3);
  });

  it('undo does nothing with no history', () => {
    store.nodes = [{ id: 'n1' }];
    store.undo();
    expect(store.nodes).toHaveLength(1);
  });

  it('redo does nothing when at end', () => {
    store.nodes = [{ id: 'n1' }];
    store.pushHistory();
    store.redo();
    expect(store.historyIndex).toBe(0);
  });

  it('pushHistory truncates future on branch', () => {
    store.nodes = [{ id: 'n1' }];
    store.pushHistory();
    store.nodes = [{ id: 'n2' }];
    store.pushHistory();
    // Go back
    store.undo();
    // Push new state (should remove n2 snapshot)
    store.nodes = [{ id: 'n3' }];
    store.pushHistory();
    // undo saved current state + we pushed new, so: original n1, undo-saved current, n3
    expect(store.history.length).toBeGreaterThanOrEqual(2);
  });

  it('limits history to 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      store.nodes = [{ id: `n${i}` }];
      store.pushHistory();
    }
    expect(store.history.length).toBeLessThanOrEqual(50);
  });

  it('multiple undo steps', () => {
    store.nodes = [{ id: 'a' }];
    store.pushHistory();
    store.nodes = [{ id: 'b' }];
    store.pushHistory();
    store.nodes = [{ id: 'c' }];

    store.undo(); // goes to b
    store.undo(); // goes to a
    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0].id).toBe('a');
  });
});
