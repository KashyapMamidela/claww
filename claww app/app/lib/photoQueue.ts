// NG PHASE 14: a meal photo that could not be uploaded (no signal) is kept on the phone and uploaded later to the path the
// meal already points at, so a meal logged offline keeps its photo. Until then the diary shows the meal type's icon (the
// thumbnail already falls back when the file is missing). Small and capped: photos are large.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const KEY = 'claww.pendingPhotos.v1';
const BUCKET = 'meal-photos';
import { MAX_PHOTO_ATTEMPTS, MAX_PENDING_PHOTOS, addPhoto, afterAttempts, type PendingPhoto } from './photoQueueLogic';
export { MAX_PHOTO_ATTEMPTS, MAX_PENDING_PHOTOS };
export type { PendingPhoto };

async function load(): Promise<PendingPhoto[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function save(list: PendingPhoto[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // a full disk only loses the photo, never the meal
  }
}

export async function queuePhoto(p: PendingPhoto): Promise<void> {
  await save(addPhoto(await load(), p));
}

export async function pendingPhotoCount(): Promise<number> {
  return (await load()).length;
}

let flushing: Promise<void> | null = null;

/** Uploads the waiting photos for the signed-in user. Safe to call often. */
export function flushPendingPhotos(): Promise<void> {
  if (!flushing) {
    flushing = (async () => {
      const list = await load();
      if (list.length === 0) return;
      const { data } = await supabase.auth.getSession();
      const me = data.session?.user.id;
      if (!me) return;
      const uploaded = new Set<string>();
      const failed = new Set<string>();
      for (const p of list) {
        if (p.userId !== me) continue;
        const { error } = await supabase.storage.from(BUCKET).upload(p.path, decode(p.base64), { contentType: p.mimeType, upsert: true });
        if (error) {
          failed.add(p.path);
          break; // no signal: stop, try again later
        }
        uploaded.add(p.path);
      }
      await save(afterAttempts(await load(), uploaded, failed));
    })().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}
