import { useCallback } from 'react';
import { getProfile } from './data';
import { supabase } from './supabase';
import { invalidateProfile } from './profileStore';
import { useProfile } from './profile';
import { addPlate, countUse, parsePlates, plateFromMeal, removePlate, type MealLike, type SavedPlate } from './plates';
import { newClientId } from './setQueueRuntime';

// Polish step 6: reading and writing the saved plates (personalization_profile.plates).

async function writePlates(userId: string, plates: SavedPlate[]): Promise<boolean> {
  const profile = await getProfile(userId);
  const next = { ...(profile?.personalization_profile ?? {}), plates };
  const { error } = await supabase.from('profiles').update({ personalization_profile: next }).eq('id', userId);
  invalidateProfile();
  if (error) {
    console.warn('[Claww] Failed to save plates:', error.message);
    return false;
  }
  return true;
}

async function current(userId: string): Promise<SavedPlate[]> {
  const profile = await getProfile(userId);
  return parsePlates(profile?.personalization_profile?.plates);
}

export async function saveMealAsPlate(userId: string, meal: MealLike): Promise<boolean> {
  return writePlates(userId, addPlate(await current(userId), plateFromMeal(meal, newClientId(), new Date())));
}

export async function deletePlate(userId: string, id: string): Promise<boolean> {
  return writePlates(userId, removePlate(await current(userId), id));
}

export async function recordPlateUse(userId: string, id: string): Promise<void> {
  await writePlates(userId, countUse(await current(userId), id));
}

/** The user's saved plates, from the cached profile. */
export function usePlates(userId: string | null): { plates: SavedPlate[]; refresh: () => Promise<void> } {
  const { profile, refresh } = useProfile(userId);
  const plates = parsePlates(profile?.personalization_profile?.plates);
  const reload = useCallback(refresh, [refresh]);
  return { plates, refresh: reload };
}
