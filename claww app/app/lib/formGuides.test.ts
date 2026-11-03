import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The authored form-guide content (V2 PHASE 8) must cover the whole catalog:
// three steps and a common mistake per exercise, in database/form_guides/.

const dbDir = join(__dirname, '..', '..', 'database');

function catalogNames(): string[] {
  const sql = readFileSync(join(dbDir, 'seed_exercises.sql'), 'utf8');
  return Array.from(sql.matchAll(/^\s*\('((?:[^']|'')+)',\s*'[^']+',/gm)).map((m) => m[1].replace(/''/g, "'"));
}

function guides(): Record<string, { steps: string[]; mistake: string }> {
  const dir = join(dbDir, 'form_guides');
  const out: Record<string, { steps: string[]; mistake: string }> = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    Object.assign(out, JSON.parse(readFileSync(join(dir, f), 'utf8')));
  }
  return out;
}

describe('exercise form guides', () => {
  const names = catalogNames();
  const g = guides();

  it('reads all 183 catalog exercises', () => {
    expect(names).toHaveLength(183);
  });

  it('has a guide for every catalog exercise and none for exercises that do not exist', () => {
    expect(names.filter((n) => !g[n])).toEqual([]);
    expect(Object.keys(g).filter((n) => !names.includes(n))).toEqual([]);
  });

  it('gives each exercise exactly three non-empty steps and a common mistake', () => {
    for (const n of names) {
      expect(g[n].steps, n).toHaveLength(3);
      for (const s of g[n].steps) expect(s.trim().length, `${n}: step`).toBeGreaterThan(15);
      expect(g[n].mistake.trim().length, `${n}: mistake`).toBeGreaterThan(15);
    }
  });

  it('keeps steps short enough for the strip and the sheet', () => {
    for (const n of names) {
      for (const s of g[n].steps) expect(s.length, `${n}: ${s}`).toBeLessThanOrEqual(190);
      expect(g[n].mistake.length, n).toBeLessThanOrEqual(190);
    }
  });

  it('uses plain text: no emoji, no markdown, no unfinished placeholders', () => {
    const all = Object.values(g).flatMap((x) => [...x.steps, x.mistake]);
    for (const t of all) {
      expect(t).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      expect(t).not.toMatch(/[*_`#]/);
      expect(t).not.toMatch(/TODO|FIXME|XXX/i);
    }
  });

  it('does not repeat one step verbatim within an exercise', () => {
    for (const n of names) expect(new Set(g[n].steps).size, n).toBe(3);
  });
});
