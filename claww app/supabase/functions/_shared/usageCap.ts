import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Per-user daily caps on AI-calling Edge Functions — protects the paid Groq
// API from a retry loop or a compromised client hammering it well past what
// the 30s double-tap cooldown in generate-plan catches (parse-meal /
// parse-meal-photo have no cooldown at all). Generous defaults; this is the
// one place to tune them.
export const GENERATION_CAPS = {
  plan: 20,
  meal: 50,
} as const;

export type GenerationKind = keyof typeof GENERATION_CAPS;

export class GenerationCapExceededError extends Error {
  constructor(public kind: GenerationKind, public cap: number) {
    super(`Daily limit of ${cap} reached for '${kind}' generations. Try again tomorrow.`);
  }
}

/**
 * Atomically checks and increments today's usage count for the calling user
 * via the check_and_increment_generation_usage Postgres function. Must be
 * called right before the actual Groq call (after any cache/cooldown
 * short-circuit) so a cached or invalid-request response never burns a slot.
 */
export async function enforceGenerationCap(supabase: SupabaseClient, kind: GenerationKind): Promise<void> {
  const cap = GENERATION_CAPS[kind];
  const { data, error } = await supabase.rpc('check_and_increment_generation_usage', { p_kind: kind, p_cap: cap });
  if (error) {
    throw new Error(`Failed to check generation cap: ${error.message}`);
  }
  if (data === -1) {
    throw new GenerationCapExceededError(kind, cap);
  }
}
