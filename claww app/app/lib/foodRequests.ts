// When the food database does not hold something (search found nothing, or the scanner heard a name it could not match),
// the name is kept so the team can verify it and add it. Only the name and where it came up are sent, never a photo.
// Best-effort: a missing table (database not updated yet) or no connection is ignored, never shown as an error.

import { supabase } from './supabase';
import { requestName } from './foodRequestName';

export type FoodRequestSource = 'search' | 'scan' | 'describe';

export async function requestFood(userId: string | null, raw: string, source: FoodRequestSource): Promise<boolean> {
  const name = requestName(raw);
  if (!userId || !name) return false;
  try {
    const { error } = await supabase.from('food_requests').insert({ user_id: userId, name, source });
    // 23505: this user already asked for it, which is fine.
    if (error && error.code !== '23505') return false;
    return true;
  } catch {
    return false;
  }
}
