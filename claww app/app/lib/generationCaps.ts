// Mirrors supabase/functions/_shared/usageCap.ts's GENERATION_CAPS. Can't be
// a shared import — one runs in Deno (Edge Functions), the other in the RN
// bundle — so if you change the caps there, change them here too. SHIP
// PHASE 8.2 uses this to show a user hitting a 429 *why*, as real numbers
// (see getGenerationUsageToday in lib/data.ts), not just a static message.
export const GENERATION_CAPS = {
  plan: 20,
  meal: 50,
} as const;
