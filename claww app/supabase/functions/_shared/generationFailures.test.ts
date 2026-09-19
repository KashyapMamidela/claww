import { describe, expect, it } from 'vitest';
import { classifyGroqFailure } from './generationFailures.ts';
import { GroqModelNotFoundError, GroqPermissionError, GroqRateLimitError, GroqRequestError } from './groq.ts';

describe('classifyGroqFailure', () => {
  it('maps each Groq error class to its matching failure kind', () => {
    expect(classifyGroqFailure(new GroqPermissionError(403, 'blocked')).kind).toBe('permission_blocked');
    expect(classifyGroqFailure(new GroqModelNotFoundError('some-model', 'gone')).kind).toBe('model_not_found');
    expect(classifyGroqFailure(new GroqRateLimitError('some-model', 'slow down')).kind).toBe('rate_limited');
    expect(classifyGroqFailure(new GroqRequestError('some-model', 503, 'down')).kind).toBe('request_error');
  });

  it('falls back to "unknown" for a plain error or non-Groq failure', () => {
    expect(classifyGroqFailure(new Error('network blip')).kind).toBe('unknown');
    expect(classifyGroqFailure('not even an Error object').kind).toBe('unknown');
  });

  it('preserves the original error message as detail', () => {
    const result = classifyGroqFailure(new GroqPermissionError(403, 'model_permission_blocked_org'));
    expect(result.detail).toContain('model_permission_blocked_org');
  });
});
