import { defineConfig } from 'vitest/config';

// Vitest runs under Node here even though supabase/functions/ ships as Deno
// Edge Functions — Deno isn't installed in every dev environment, and the
// specific functions under test (_shared/recovery.ts, _shared/planning.ts)
// are deliberately plain dependency-free TypeScript with zero Deno-specific
// imports, so they run identically under either runtime. This project has
// no root-level package.json by design (app/ is the only real npm project),
// so the config lives here and reaches out to supabase/functions/ via a
// relative include pattern rather than duplicating a test setup there.
export default defineConfig({
  test: {
    include: ['**/*.test.ts', '../supabase/functions/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
  },
});
