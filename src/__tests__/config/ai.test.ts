import { describe, it, expect } from 'vitest';
import { AI_IMAGE_SIZE_LIMIT } from '../../config/ai';

describe('AI config', () => {
  it('AI_IMAGE_SIZE_LIMIT is 5MB', () => {
    expect(AI_IMAGE_SIZE_LIMIT).toBe(5 * 1024 * 1024);
  });
});
