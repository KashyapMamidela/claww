// NG PHASE 9: an ordered list of vision providers with a timeout each. The first to return a valid answer wins; a
// timeout, an error or an answer that fails validation moves on to the next. Provider objects are built by the
// caller (the Edge Function has Deno and the secrets), so this file is pure and Vitest tests the order with mocks.

export interface VisionProvider {
  /** Shown in logs: "groq:qwen/qwen3.8-27b", "backup:gemini-2.0-flash". */
  name: string;
  call: (system: string, user: string, imageDataUri: string, signal: AbortSignal) => Promise<string>;
}

export interface VisionAttempt {
  provider: string;
  ok: boolean;
  ms: number;
  error?: string;
}

export interface VisionResult<T> {
  value: T;
  provider: string;
  attempts: VisionAttempt[];
}

export class AllVisionProvidersFailed extends Error {
  attempts: VisionAttempt[];
  constructor(attempts: VisionAttempt[]) {
    super(`All vision providers failed: ${attempts.map((a) => `${a.provider} (${a.error ?? 'failed'})`).join('; ')}`);
    this.name = 'AllVisionProvidersFailed';
    this.attempts = attempts;
  }
}

export const PROVIDER_TIMEOUT_MS = 8000;

/** Runs `p` for at most `ms`, aborting its signal on the way out. */
async function withTimeout(p: VisionProvider, system: string, user: string, image: string, ms: number): Promise<string> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timed out after ${ms} ms`));
    }, ms);
  });
  try {
    return await Promise.race([p.call(system, user, image, controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Tries each provider in order. `parse` turns the provider's text into the validated value or returns null (which
 * counts as a failure and moves on). The total time is at most providers x timeout, so with two providers an answer
 * arrives (or the failure is reported) within 16 s, and a Groq failure that is fast costs almost nothing.
 */
export async function callVisionProviders<T>(
  providers: VisionProvider[],
  system: string,
  user: string,
  imageDataUri: string,
  parse: (text: string) => T | null,
  timeoutMs = PROVIDER_TIMEOUT_MS
): Promise<VisionResult<T>> {
  const attempts: VisionAttempt[] = [];
  for (const p of providers) {
    const started = Date.now();
    try {
      const text = await withTimeout(p, system, user, imageDataUri, timeoutMs);
      let value: T | null = null;
      try {
        value = parse(text);
      } catch {
        value = null;
      }
      if (value === null) {
        attempts.push({ provider: p.name, ok: false, ms: Date.now() - started, error: 'answer failed validation' });
        continue;
      }
      attempts.push({ provider: p.name, ok: true, ms: Date.now() - started });
      return { value, provider: p.name, attempts };
    } catch (error) {
      attempts.push({ provider: p.name, ok: false, ms: Date.now() - started, error: (error as Error).message.slice(0, 160) });
    }
  }
  throw new AllVisionProvidersFailed(attempts);
}

/** Some models wrap JSON in a code fence ("```json ... ```"); this returns the JSON text inside. */
export function stripJsonFence(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : t;
}

/**
 * An OpenAI-compatible chat-completions provider (the backup: configurable by three secrets, no code change).
 * Providers differ on `response_format: json_object`: if one answers 400 to it, the call is repeated once without it
 * (the prompt already asks for JSON only) and a code fence around the answer is removed.
 */
export function openAiCompatibleProvider(cfg: { name: string; url: string; key: string; model: string }, fetchImpl: typeof fetch = fetch): VisionProvider {
  return {
    name: cfg.name,
    call: async (system, user, image, signal) => {
      const send = (withJsonMode: boolean) =>
        fetchImpl(cfg.url, {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
          body: JSON.stringify({
            model: cfg.model,
            temperature: 0.2,
            ...(withJsonMode ? { response_format: { type: 'json_object' } } : {}),
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: [{ type: 'text', text: user }, { type: 'image_url', image_url: { url: image } }] },
            ],
          }),
        });
      let res = await send(true);
      if (res.status === 400) res = await send(false);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('empty answer');
      return stripJsonFence(content);
    },
  };
}
