import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// SHIP PHASE 6.3: right now a Groq failure degrades silently to DEFAULT_PLAN
// (or a 422/503 for meal parsing) and nothing anywhere records how often that
// happens. This is the one place every fallback path in generate-plan,
// parse-meal, and parse-meal-photo reports through, so "is the AI actually
// working" is a query against generation_failures, not a guess from support
// tickets. Purely operator-facing — never surfaced to the user, so this does
// not touch design principle #2.
export type FailureKind =
  | 'permission_blocked'
  | 'model_not_found'
  | 'rate_limited'
  | 'request_error'
  | 'validation_failed'
  | 'grounding_emptied'
  | 'unknown';

/**
 * Best-effort: a failure to log a failure must never mask or replace the
 * original fallback behavior, so this only logs to console on error rather
 * than throwing. Runs on the caller's own user-scoped client — RLS already
 * allows a user to insert their own row, same as every other own-rows table.
 */
export async function logGenerationFailure(
  supabase: SupabaseClient,
  userId: string,
  functionName: string,
  kind: FailureKind,
  detail: string
): Promise<void> {
  const { error } = await supabase
    .from('generation_failures')
    .insert({ user_id: userId, function_name: functionName, failure_kind: kind, detail: detail.slice(0, 2000) });
  if (error) {
    console.error(`[generationFailures] Failed to record failure (${functionName}/${kind}): ${error.message}`);
  }
}

/** Maps a caught error from callGroqJSON/callGroqVisionJSON to a FailureKind, for a consistent classification across all three AI-calling functions. */
export function classifyGroqFailure(error: unknown): { kind: FailureKind; detail: string } {
  const name = (error as { name?: string })?.name;
  const message = (error as Error)?.message ?? String(error);
  switch (name) {
    case 'GroqPermissionError':
      return { kind: 'permission_blocked', detail: message };
    case 'GroqModelNotFoundError':
      return { kind: 'model_not_found', detail: message };
    case 'GroqRateLimitError':
      return { kind: 'rate_limited', detail: message };
    case 'GroqRequestError':
      return { kind: 'request_error', detail: message };
    default:
      return { kind: 'unknown', detail: message };
  }
}
