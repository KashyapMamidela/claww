const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// llama-3.3-70b-versatile was deprecated and removed by Groq (June 2026).
// openai/gpt-oss-120b is Groq's own recommended replacement — best fit for
// this app's structured-JSON generation (large context, reasoning,
// structured_outputs support). As of writing this returns
// 403 model_permission_blocked_org until the model is enabled at
// console.groq.com/settings/limits for this org — every model on this
// account's key does, regardless of size, so that's an account-settings
// step, not a model-choice problem.
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Thrown specifically for a 401/403 from Groq — almost always means the
 * model isn't enabled for this org at console.groq.com/settings/limits,
 * not a transient failure. Callers must log this distinctly from a normal
 * Groq-call failure or JSON-validation fallback: those are expected to
 * happen occasionally per-request, this means EVERY request is broken
 * until someone fixes the account setting.
 */
export class GroqPermissionError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`Groq permission error (${status}): ${body}`);
    this.name = 'GroqPermissionError';
    this.status = status;
  }
}

/**
 * Calls Groq's chat-completions API and returns the raw JSON string content
 * of the assistant's reply. Callers are responsible for parsing/validating it.
 */
export async function callGroqJSON(messages: GroqMessage[], temperature = 0.4): Promise<string> {
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
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new GroqPermissionError(response.status, text);
    }
    throw new Error(`Groq API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Groq response missing message content');
  }
  return content;
}

/**
 * Same contract as callGroqJSON, but sends one image alongside the text
 * prompt to Groq's vision model. imageDataUri must be a full data URI
 * (e.g. "data:image/jpeg;base64,...").
 */
export async function callGroqVisionJSON(systemPrompt: string, userText: string, imageDataUri: string): Promise<string> {
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
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
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
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new GroqPermissionError(response.status, text);
    }
    throw new Error(`Groq vision API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Groq vision response missing message content');
  }
  return content;
}
