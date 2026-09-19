import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Vitest runs under Node (see vitest.config.mts), but groq.ts only touches
// the Deno global inside function bodies (Deno.env.get), never at module
// load — so stubbing it here before any test invokes those functions is
// enough to run this file under Node without installing Deno.
beforeAll(() => {
  (globalThis as unknown as { Deno: { env: { get: () => string } } }).Deno = {
    env: { get: () => 'test-groq-api-key' },
  };
});

import { callGroqJSON, GROQ_MODEL_CHAINS, GroqPermissionError } from './groq.ts';

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

function errorResponse(status: number, body = 'error') {
  return { ok: false, status, text: async () => body } as Response;
}

describe('callGroqJSON fallback chain', () => {
  const fetchMock = vi.fn();

  beforeAll(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('falls through to the next model when the primary is permission-blocked, and reports which model actually served it', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(403, 'model_permission_blocked_org'))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: '{"days":[]}' } }] }));

    const result = await callGroqJSON([{ role: 'user', content: 'hi' }]);

    expect(result.content).toBe('{"days":[]}');
    expect(result.model).toBe(GROQ_MODEL_CHAINS.text[1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries past a rate-limited model and a not-found model to reach a working one', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(429, 'rate limited'))
      .mockResolvedValueOnce(errorResponse(404, 'model not found'))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: '{"days":[]}' } }] }));

    const result = await callGroqJSON([{ role: 'user', content: 'hi' }]);

    expect(result.model).toBe(GROQ_MODEL_CHAINS.text[2]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws the last error when every model in the chain is blocked, not the first', async () => {
    fetchMock.mockResolvedValue(errorResponse(403, 'blocked everywhere'));

    await expect(callGroqJSON([{ role: 'user', content: 'hi' }])).rejects.toThrow(GroqPermissionError);
    expect(fetchMock).toHaveBeenCalledTimes(GROQ_MODEL_CHAINS.text.length);
  });

  it('does not retry a non-retryable client error (e.g. malformed request) — every model would reject it identically', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(400, 'bad request'));

    await expect(callGroqJSON([{ role: 'user', content: 'hi' }])).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
