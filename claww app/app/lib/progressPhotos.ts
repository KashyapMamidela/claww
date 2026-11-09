import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { newClientId } from './setQueueRuntime';

// Premium F7: progress photos. A private bucket (one folder per user) plus a table with the path, the date and the
// weight that day. Nothing is public; photos are shown through 1-hour signed links.

const BUCKET = 'progress-photos';

export interface ProgressPhoto {
  id: string;
  path: string;
  takenOn: string; // YYYY-MM-DD
  weightKg: number | null;
}

export async function listProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('id, path, taken_on, weight_kg')
    .eq('user_id', userId)
    .order('taken_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[Claww] Progress photos not loaded:', error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({ id: r.id, path: r.path, takenOn: r.taken_on, weightKg: r.weight_kg }));
}

export async function addProgressPhoto(userId: string, base64: string, mimeType: string, weightKg: number | null): Promise<ProgressPhoto | null> {
  const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
  const path = `${userId}/${newClientId()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, decode(base64), { contentType: mimeType, upsert: false });
  if (up.error) {
    console.warn('[Claww] Progress photo upload failed:', up.error.message);
    return null;
  }
  const now = new Date();
  const takenOn = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('progress_photos')
    .insert({ user_id: userId, path, taken_on: takenOn, weight_kg: weightKg })
    .select('id, path, taken_on, weight_kg')
    .single();
  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([path]);
    return null;
  }
  return { id: data.id, path: data.path, takenOn: data.taken_on, weightKg: data.weight_kg };
}

export async function deleteProgressPhoto(photo: ProgressPhoto): Promise<boolean> {
  const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id);
  if (error) return false;
  await supabase.storage.from(BUCKET).remove([photo.path]);
  return true;
}

export async function signedProgressUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}

export { photoDateLabel, daysApart } from './progressPhotoMath';
