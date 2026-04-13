import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[ApexPro Backend] Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
  );
}

/**
 * Supabase client for use in Next.js API routes (server-side).
 * For user-authenticated operations, prefer Supabase's server-side
 * client with the user's JWT (via createRouteHandlerClient or similar).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
