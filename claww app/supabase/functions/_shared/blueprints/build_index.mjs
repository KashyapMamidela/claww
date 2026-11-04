// Rewrites index.ts from the *.json blueprints in this folder (run from the "claww app" folder).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bps = readdirSync(here).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(here, f), 'utf8')));
const out = `// GENERATED from the *.json files in this folder. Do not edit by hand: change a JSON file, then run
//   node supabase/functions/_shared/blueprints/build_index.mjs
// A test fails if this file and the JSON files disagree. (Deno edge functions and Vitest both import this
// plain module, which avoids JSON import attributes that the two runtimes handle differently.)

import type { Blueprint } from './schema.ts';

export const BLUEPRINTS: Blueprint[] = ${JSON.stringify(bps, null, 2)};
`;
writeFileSync(join(here, 'index.ts'), out, 'utf8');
console.log(`Wrote ${bps.length} blueprints.`);
