// Builds database/seed_exercise_form_guides.sql from database/form_guides/*.json.
//
// The JSON files are the source of truth: authored text for each exercise's
// three form steps and common mistake, reviewed by a person and never
// generated at runtime. Edit the JSON, then run (from the "claww app" folder):
//
//   node database/build_form_guides.mjs
//
// and commit both. The SQL it writes is idempotent (updates rows by name).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export function loadGuides() {
  const dir = join(here, 'form_guides');
  const out = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const [name, guide] of Object.entries(data)) {
      if (out[name]) throw new Error(`Duplicate guide for ${name} (in ${file})`);
      out[name] = guide;
    }
  }
  return out;
}

const q = (t) => `'${t.replace(/'/g, "''")}'`;

export function buildSql(guides) {
  const rows = Object.entries(guides).map(
    ([name, g]) => `  (${q(name)}, ARRAY[${g.steps.map(q).join(', ')}]::text[], ${q(g.mistake)})`
  );
  return `-- ============================================================
-- Claww: exercise form guides (V2 PHASE 8)
--
-- GENERATED from database/form_guides/*.json by
-- database/build_form_guides.mjs. Edit the JSON and re-run the script, not
-- this file. NEEDS REVIEW BY THE CO-FOUNDER: the text was drafted, not
-- sourced from a coach, and should be read for accuracy and tone.
--
-- Three numbered form steps and one common mistake per exercise, shown in the
-- player's form strip and the exercise guide sheet. Authored text only; it is
-- never generated at runtime. Run after schema.sql, seed_exercises.sql and
-- seed_exercise_metadata.sql. Safe to run any number of times.
-- ============================================================

UPDATE exercises AS e SET
  form_steps = v.form_steps,
  common_mistake = v.common_mistake
FROM (VALUES
${rows.join(',\n')}
) AS v(name, form_steps, common_mistake)
WHERE e.name = v.name;
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const guides = loadGuides();
  writeFileSync(join(here, 'seed_exercise_form_guides.sql'), buildSql(guides), 'utf8');
  console.log(`Wrote ${Object.keys(guides).length} guides.`);
}
