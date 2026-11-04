// NG PHASE 3.4: which exercises can stand in for the current one ("Swap · bench taken?").
// Pure so Vitest can test it. The catalog pool is loaded by adaptiveData.getSwapPool.

import { deriveAllowedEquipment, excludeInjuredExercises, isExerciseAllowed, type Injury } from './engine';
import type { CatalogEntry } from './muscleRecovery';

export const MAX_SWAP_CANDIDATES = 6;

export interface SwapOptions {
  /** Names already in today's session: never offered again. */
  todayNames: string[];
  /** The user's equipment tier (gym / home / none); null means a gym. */
  equipment: string | null;
  /** The user's free-text injuries (the same filter generate-plan applies). */
  injuriesText: string | null;
  /** NG PHASE 5: the structured injuries from the profile (body part and severity). */
  injuries?: Injury[];
  limit?: number;
}

/**
 * Up to six exercises with the same primary muscle and the same movement pattern as `current`,
 * from the user's allowed equipment and not excluded by their injuries. Same-role exercises come
 * first, then the same equipment as the current one, then by name, so the list is stable.
 */
export function swapCandidates(current: CatalogEntry, pool: CatalogEntry[], opts: SwapOptions): CatalogEntry[] {
  if (!current.primaryMuscle || !current.movementPattern) return [];
  const allowed = deriveAllowedEquipment(opts.equipment);
  const taken = new Set(opts.todayNames.map((n) => n.trim().toLowerCase()));
  taken.add(current.name.trim().toLowerCase());

  const matches = pool.filter(
    (e) =>
      e.modality === 'strength' &&
      e.id !== current.id &&
      e.primaryMuscle === current.primaryMuscle &&
      e.movementPattern === current.movementPattern &&
      !taken.has(e.name.trim().toLowerCase()) &&
      allowed.includes(e.equipment ?? 'gym')
  );
  const safe = excludeInjuredExercises(matches, opts.injuriesText).filter((e) =>
    isExerciseAllowed({ name: e.name, movement_pattern: e.movementPattern, stimulus_type: e.stimulusType ?? null }, opts.injuries ?? [])
  );
  const rank = (e: CatalogEntry) => (e.role === current.role ? 0 : 1) * 2 + (e.equipment === current.equipment ? 0 : 1);
  return [...safe].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, opts.limit ?? MAX_SWAP_CANDIDATES);
}
