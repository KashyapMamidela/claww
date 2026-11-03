// NG PHASE 2: pure helpers over a profile row's basic details (no Supabase import, so they're testable).

interface BasicsRow {
  height: number | null;
  weight: number | null;
  age: number | null;
  gender: string | null;
}

export interface ProfileBasics {
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  gender: string | null;
}

export function profileBasics(p: BasicsRow | null): ProfileBasics {
  const pos = (v: number | null | undefined) => (typeof v === 'number' && v > 0 ? v : null);
  return { heightCm: pos(p?.height), weightKg: pos(p?.weight), age: pos(p?.age), gender: p?.gender ?? null };
}

/** Whether the profile already holds every field a setup step needs, so it can skip asking. */
export function hasBasics(b: ProfileBasics, needs: (keyof ProfileBasics)[]): boolean {
  return needs.every((k) => b[k] !== null);
}

/** "175 cm · 70 kg · 28 yrs" for the fields given, skipping any that are missing. */
export function basicsSummary(b: ProfileBasics, fields: ('heightCm' | 'weightKg' | 'age')[]): string {
  const parts: string[] = [];
  for (const f of fields) {
    const v = b[f];
    if (v === null) continue;
    if (f === 'heightCm') parts.push(`${Math.round(v)} cm`);
    if (f === 'weightKg') parts.push(`${Math.round(v * 10) / 10} kg`);
    if (f === 'age') parts.push(`${v} yrs`);
  }
  return parts.join(' · ');
}
