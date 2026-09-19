import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { GROQ_MODEL_CHAINS, probeGroqModel } from '../_shared/groq.ts';

// SHIP PHASE 6.2 — the one place "is the AI actually working" is a direct
// read instead of an inference from plan shape or support tickets. Makes one
// minimal real call to every model in both fallback chains and reports each
// one's exact status. Deliberately does NOT go through enforceGenerationCap
// — a health probe must never burn a user's daily generation slot, and it
// has no user context to charge it against anyway (see the shared-secret
// auth below, not a user JWT).
//
// Deploy with `npx supabase functions deploy health-check --no-verify-jwt`
// (it authenticates via HEALTH_CHECK_SECRET instead of a user JWT — there is
// no user calling this) and set the secret with
// `npx supabase secrets set HEALTH_CHECK_SECRET=<a-random-value>`.
// Call it with `curl -H "x-health-secret: <value>" https://<project>.supabase.co/functions/v1/health-check`.

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const expectedSecret = Deno.env.get('HEALTH_CHECK_SECRET');
  if (!expectedSecret) {
    return new Response(JSON.stringify({ error: 'HEALTH_CHECK_SECRET is not configured for this project' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const providedSecret = req.headers.get('x-health-secret');
  if (providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
  }

  const [textResults, visionResults] = await Promise.all([
    Promise.all(GROQ_MODEL_CHAINS.text.map(probeGroqModel)),
    Promise.all(GROQ_MODEL_CHAINS.vision.map(probeGroqModel)),
  ]);

  const allResults = [...textResults, ...visionResults];
  const anyChainFullyHealthy = {
    text: textResults.some((r) => r.status === 'ok'),
    vision: visionResults.some((r) => r.status === 'ok'),
  };
  // "healthy" means at least one candidate in each chain works — that's the
  // actual guarantee callWithFallback gives generation, not that every
  // single model is reachable.
  const healthy = anyChainFullyHealthy.text && anyChainFullyHealthy.vision;

  return new Response(
    JSON.stringify(
      {
        healthy,
        checkedAt: new Date().toISOString(),
        chains: {
          text: { anyHealthy: anyChainFullyHealthy.text, primaryModel: GROQ_MODEL_CHAINS.text[0], results: textResults },
          vision: { anyHealthy: anyChainFullyHealthy.vision, primaryModel: GROQ_MODEL_CHAINS.vision[0], results: visionResults },
        },
      },
      null,
      2
    ),
    { status: healthy ? 200 : 503, headers: jsonHeaders }
  );
});
