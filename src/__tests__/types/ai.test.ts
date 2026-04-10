import { describe, it, expect } from 'vitest';
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS } from '../../types/ai';

describe('AI_PROVIDERS', () => {
  it('has at least 3 providers', () => {
    expect(AI_PROVIDERS.length).toBeGreaterThanOrEqual(3);
  });

  it('each provider has models', () => {
    for (const p of AI_PROVIDERS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.models.length).toBeGreaterThan(0);
    }
  });

  it('includes anthropic, openai, gemini', () => {
    const ids = AI_PROVIDERS.map(p => p.id);
    expect(ids).toContain('anthropic');
    expect(ids).toContain('openai');
    expect(ids).toContain('gemini');
  });
});

describe('DEFAULT_AI_SETTINGS', () => {
  it('has empty providers and null active provider', () => {
    expect(DEFAULT_AI_SETTINGS.providers).toEqual({});
    expect(DEFAULT_AI_SETTINGS.activeProvider).toBeNull();
  });
});
