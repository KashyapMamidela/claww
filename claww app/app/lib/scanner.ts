// NG PHASE 9: the scanner's server calls and the little in-memory session that carries a scan from the camera screen
// to the check screen.

import { supabase } from './supabase';
import { extractInvokeErrorMessage } from './data';
import type { ScanContext, ScanFood, ScanItem } from './engine';
import type { PastScan } from './scanHabit';

export interface ScanResult {
  route: 'ok' | 'not_sure';
  dish: string;
  confidence: number;
  candidates: string[];
  items: ScanItem[];
  oilFood: ScanFood | null;
  model: string;
}

export type ScanOutcome = { ok: true; result: ScanResult } | { ok: false; reason: string };

/** Sends the photo to the scan-plate function. The function only names items; the numbers come from the food database. */
export async function scanPlate(imageDataUri: string): Promise<ScanOutcome> {
  const { data, error } = await supabase.functions.invoke('scan-plate', { body: { image: imageDataUri } });
  if (error) {
    const message = await extractInvokeErrorMessage(error);
    return { ok: false, reason: message ?? "Couldn't scan that photo. Check your connection and try again, or log the meal by name." };
  }
  if (data?.blocked) return { ok: false, reason: data.reason ?? "That photo couldn't be processed." };
  if (!data || !Array.isArray(data.items)) return { ok: false, reason: "Couldn't read that plate. Try a clearer photo, or log it by name." };
  return { ok: true, result: data as ScanResult };
}

/** The user's earlier scans (with their answers) for "last time" and habit. Empty until meal_logs.context exists. */
export async function getPastScans(userId: string): Promise<PastScan[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('description, context, logged_at')
    .eq('user_id', userId)
    .not('context', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(40);
  if (error) return [];
  return (data ?? []) as PastScan[];
}

/** One opt-in training row: the photo, what the model guessed, the answers and the items the user confirmed. */
export async function saveScanCorrection(
  userId: string,
  row: { photoPath: string | null; model: string; guess: unknown; context: ScanContext; finalItems: unknown }
): Promise<void> {
  const { error } = await supabase.from('scan_corrections').insert({
    user_id: userId,
    photo_path: row.photoPath,
    model: row.model,
    model_guess: row.guess,
    context: row.context,
    final_items: row.finalItems,
  });
  if (error) console.warn('[Claww] Failed to save a scan correction:', error.message);
}

// ── the session carried between the two screens ─────────────────────────────────────────────────────────────────

export interface ScanSession {
  photoUri: string;
  base64: string;
  mimeType: string;
  mealType: string;
  /** Resolves when the scan finishes, so the check screen can wait for it. */
  pending: Promise<ScanOutcome>;
  outcome: ScanOutcome | null;
  context: ScanContext;
}

let session: ScanSession | null = null;
export const getScanSession = () => session;
export const setScanSession = (s: ScanSession | null) => {
  session = s;
};
