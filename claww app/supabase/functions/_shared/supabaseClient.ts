import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

/**
 * Builds a Supabase client scoped to the caller's own JWT, so that all
 * queries run under their auth.uid() and are subject to RLS — never use
 * the service role for user-facing reads/writes.
 */
export function userClientFromRequest(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new UnauthorizedError('Missing Authorization header');
  }

  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
}

export class UnauthorizedError extends Error {}

export async function requireUser(supabase: SupabaseClient): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError('Unauthorized');
  }

  return user;
}
