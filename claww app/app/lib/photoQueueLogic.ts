// NG PHASE 14: the pure part of the meal photo queue (lib/photoQueue.ts holds the AsyncStorage and Supabase parts).

export const MAX_PENDING_PHOTOS = 12;
export const MAX_PHOTO_ATTEMPTS = 20;

export interface PendingPhoto {
  userId: string;
  path: string;
  base64: string;
  mimeType: string;
  attempts: number;
}

/** Pure: add a photo (replacing one with the same path), keep the newest MAX_PENDING_PHOTOS. */
export function addPhoto(list: PendingPhoto[], p: PendingPhoto): PendingPhoto[] {
  return [...list.filter((x) => x.path !== p.path), p].slice(-MAX_PENDING_PHOTOS);
}

/** Pure: drop the ones that were uploaded and the ones that failed too many times; count a failed try on the rest. */
export function afterAttempts(list: PendingPhoto[], uploaded: Set<string>, failed: Set<string>): PendingPhoto[] {
  return list
    .filter((p) => !uploaded.has(p.path))
    .map((p) => (failed.has(p.path) ? { ...p, attempts: p.attempts + 1 } : p))
    .filter((p) => p.attempts < MAX_PHOTO_ATTEMPTS);
}

