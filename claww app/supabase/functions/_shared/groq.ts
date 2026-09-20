const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Ordered fallback chains, not a single hardcoded model. A single-model setup
// meant a block/deprecation on that one model took down 100% of generation
// with no recourse — this chain exists so a blocked/decommissioned/
// rate-limited primary degrades to a working model instead of straight to
// DEFAULT_PLAN.
//
// SHIP PHASE 6.1 (verified 2026-09-19 via GET /openai/v1/models against the
// live GROQ_API_KEY, then confirmed live via health-check): both text models
// below exist and are active for this org. openai/gpt-oss-20b is the same
// OSS family as the primary (tools, json_mode, structured_outputs) — a real
// second option, not a downgrade guess.
//
// Vision has only ONE image-capable model on this account: qwen/qwen3.8-27b.
// qwen/qwen3.6-27b (previously configured) and llama-3.2-90b-vision-preview
// (decommissioned by Groq) do not exist for this org — confirmed absent from
// the live /models listing, not just a 404 fluke. There is currently no real
// second vision model to fall back to; callGroqVisionJSON's caller must
// handle a total vision-chain failure as a real failure (surfaced via
// generation_failures, SHIP PHASE 6.3), not assume a fallback exists.
// Re-run the /models check periodically — Groq's vision lineup moves fast.
const GROQ_TEXT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'] as const;
const GROQ_VISION_MODELS = ['qwen/qwen3.8-27b'] as const;

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResult {
  content: string;
  /** Which model in the chain actually served this response — never assume it was the first. */
  model: string;
}

/**
 * Thrown for a 401/403 from Groq — almost always means the model isn't
 * enabled for this org at console.groq.com/settings/limits, not a transient
 * failure. Retryable against the next model in the chain.
 */
export class GroqPermissionError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`Groq permission error (${status}): ${body}`);
    this.name = 'GroqPermissionError';
    this.status = status;
  }
}

/** Thrown for a 404 — the model id doesn't exist in Groq's catalog (deprecated/removed/typo'd). Retryable against the next model. */
export class GroqModelNotFoundError extends Error {
  constructor(model: string, body: string) {
    super(`Groq model not found (${model}): ${body}`);
    this.name = 'GroqModelNotFoundError';
  }
}

/** Thrown for a 429 — retryable against the next model, since a different model has a separate rate-limit bucket. */
export class GroqRateLimitError extends Error {
  constructor(model: string, body: string) {
    super(`Groq rate limited (${model}): ${body}`);
    this.name = 'GroqRateLimitError';
  }
}

/** Everything else non-2xx: retryable against the next model (covers Groq-side 5xx), but distinct from the typed errors above for logging. */
export class GroqRequestError extends Error {
  status: number;
  constructor(model: string, status: number, body: string) {
    super(`Groq API error (${status}) for model ${model}: ${body}`);
    this.name = 'GroqRequestError';
    this.status = status;
  }
}

function classifyGroqError(model: string, status: number, body: string): Error {
  if (status === 401 || status === 403) return new GroqPermissionError(status, body);
  if (status === 404) return new GroqModelNotFoundError(model, body);
  if (status === 429) return new GroqRateLimitError(model, body);
  return new GroqRequestError(model, status, body);
}

// A 4xx other than 401/403/404/429 (e.g. 400 malformed request) means the
// request itself is bad — every model in the chain will reject it the same
// way, so retrying is pure wasted latency. Only retry the classes above.
function isRetryable(error: unknown): boolean {
  return (
    error instanceof GroqPermissionError ||
    error instanceof GroqModelNotFoundError ||
    error instanceof GroqRateLimitError ||
    (error instanceof GroqRequestError && error.status >= 500)
  );
}

async function requestGroqChatCompletion(model: string, body: Record<string, unknown>): Promise<string> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, ...body }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw classifyGroqError(model, response.status, text);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error(`Groq response missing message content (model ${model})`);
  }
  return content;
}

/**
 * Tries each model in `chain` in order, moving to the next only on a
 * retryable failure (blocked, not-found, rate-limited, or Groq-side 5xx).
 * A non-retryable failure (e.g. malformed request) aborts immediately since
 * every model would reject it identically. Throws the *last* error if every
 * candidate fails, so callers see the most relevant failure, not the first.
 */
async function callWithFallback(chain: readonly string[], body: Record<string, unknown>): Promise<GroqResult> {
  let lastError: unknown;
  for (const model of chain) {
    try {
      const content = await requestGroqChatCompletion(model, body);
      return { content, model };
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
      console.error(`[groq] ${model} failed (${(error as Error).name}), trying next candidate: ${(error as Error).message}`);
    }
  }
  throw lastError;
}

/**
 * Calls Groq's chat-completions API across the text fallback chain and
 * returns the raw JSON string content plus which model actually served it.
 * Callers are responsible for parsing/validating the content.
 */
export async function callGroqJSON(messages: GroqMessage[], temperature = 0.4): Promise<GroqResult> {
  return callWithFallback(GROQ_TEXT_MODELS, {
    messages,
    temperature,
    response_format: { type: 'json_object' },
  });
}

/**
 * Same contract as callGroqJSON, but sends one image alongside the text
 * prompt across the vision fallback chain. imageDataUri must be a full data
 * URI (e.g. "data:image/jpeg;base64,...").
 */
export async function callGroqVisionJSON(systemPrompt: string, userText: string, imageDataUri: string): Promise<GroqResult> {
  return callWithFallback(GROQ_VISION_MODELS, {
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: imageDataUri } },
        ],
      },
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });
}

/** Exposed for the health-check function so it can probe the exact chain in use without duplicating the model lists. */
export const GROQ_MODEL_CHAINS = { text: GROQ_TEXT_MODELS, vision: GROQ_VISION_MODELS } as const;

export interface GroqProbeResult {
  model: string;
  status: 'ok' | 'permission_blocked' | 'not_found' | 'rate_limited' | 'error';
  detail?: string;
}

/**
 * Makes one minimal real call to a single named model and reports its exact
 * status — never throws. This deliberately bypasses callWithFallback: the
 * whole point of the health check is knowing which *specific* models in the
 * chain are blocked, not getting a response from whichever one happens to
 * work. Used by the health-check Edge Function (SHIP PHASE 6.2), never by
 * user-facing generation.
 */
export async function probeGroqModel(model: string): Promise<GroqProbeResult> {
  try {
    await requestGroqChatCompletion(model, {
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_completion_tokens: 5,
    });
    return { model, status: 'ok' };
  } catch (error) {
    const name = (error as { name?: string })?.name;
    const detail = (error as Error)?.message ?? String(error);
    if (name === 'GroqPermissionError') return { model, status: 'permission_blocked', detail };
    if (name === 'GroqModelNotFoundError') return { model, status: 'not_found', detail };
    if (name === 'GroqRateLimitError') return { model, status: 'rate_limited', detail };
    return { model, status: 'error', detail };
  }
}
