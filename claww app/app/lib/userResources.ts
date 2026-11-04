// NG PHASE 6: reading and saving the user's food situation (table user_resources, owner-only).

import { supabase } from './supabase';
import { type AvailabilityMap, type Cook, type Diet, type Source } from './resourceDefaults';

export interface UserResources {
  sources: Source[];
  cookWith: Cook[];
  diet: Diet;
  budgetInrDay: number | null;
  planStyle: 'same' | 'varied';
  availability: Partial<AvailabilityMap>;
  avoid: string[];
}

interface Row {
  sources: Source[] | null;
  cook_with: Cook[] | null;
  diet: Diet;
  budget_inr_day: number | null;
  plan_style: 'same' | 'varied' | null;
  availability: Partial<AvailabilityMap> | null;
  avoid: string[] | null;
}

export async function getUserResources(userId: string): Promise<UserResources | null> {
  const { data, error } = await supabase
    .from('user_resources')
    .select('sources, cook_with, diet, budget_inr_day, plan_style, availability, avoid')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.warn('[Claww] Failed to load food resources:', error.message);
    return null;
  }
  const r = data as Row;
  return {
    sources: r.sources ?? [],
    cookWith: r.cook_with ?? [],
    diet: r.diet,
    budgetInrDay: r.budget_inr_day,
    planStyle: r.plan_style ?? 'same',
    availability: r.availability ?? {},
    avoid: r.avoid ?? [],
  };
}

export async function saveUserResources(userId: string, r: UserResources): Promise<boolean> {
  const { error } = await supabase.from('user_resources').upsert(
    {
      user_id: userId,
      sources: r.sources,
      cook_with: r.cookWith,
      diet: r.diet,
      budget_inr_day: r.budgetInrDay,
      plan_style: r.planStyle,
      availability: r.availability,
      avoid: r.avoid,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    console.warn('[Claww] Failed to save food resources:', error.message);
    return false;
  }
  return true;
}
