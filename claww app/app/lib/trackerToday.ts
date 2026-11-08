// NG PHASE 13 (Tracker v3, without the wearable reads): the rules behind the Tracker's top cards. Pure.

export type Level = 'good' | 'ok' | 'low';

export interface RecoveryFactor {
  label: string;
  value: string;
  word: string;
  level: Level;
}

/** Training load from the sets logged in the last 72 hours. */
export function trainingLoad(setsLast72h: number): 'low' | 'normal' | 'high' {
  return setsLast72h < 12 ? 'low' : setsLast72h <= 30 ? 'normal' : 'high';
}

/**
 * The three things recovery is built from, in words: sleep, training load, protein. (Resting heart rate replaces
 * protein once a wearable supplies it, NG PHASE 13's wearable step; until then protein is the honest third factor
 * because it is already part of the recovery score.)
 */
export function recoveryFactors(i: { sleepHours: number | null; setsLast72h: number; proteinPct: number | null }): RecoveryFactor[] {
  const out: RecoveryFactor[] = [];
  if (i.sleepHours === null) out.push({ label: 'Sleep', value: 'not logged', word: '', level: 'ok' });
  else {
    const h = Math.round(i.sleepHours * 10) / 10;
    out.push({ label: `Sleep ${h} h`, value: '', word: i.sleepHours < 6.5 ? '– short' : i.sleepHours >= 7.5 ? 'good' : 'okay', level: i.sleepHours < 6.5 ? 'low' : i.sleepHours >= 7.5 ? 'good' : 'ok' });
  }
  const load = trainingLoad(i.setsLast72h);
  out.push({ label: 'Training load', value: '', word: load === 'high' ? 'high' : load === 'low' ? 'light' : 'normal', level: load === 'high' ? 'low' : 'good' });
  if (i.proteinPct === null) out.push({ label: 'Protein', value: 'not tracked', word: '', level: 'ok' });
  else out.push({ label: `Protein ${Math.round(i.proteinPct)} %`, value: '', word: i.proteinPct >= 80 ? 'on track' : i.proteinPct >= 50 ? 'a bit low' : 'low', level: i.proteinPct >= 80 ? 'good' : i.proteinPct >= 50 ? 'ok' : 'low' });
  return out;
}

export const BEDTIME_FOR_HOURS = 8;

/** "11:30 PM": the bedtime that gives `hours` of sleep before `wakeHHMM`, rounded to the nearest 15 minutes. */
export function bedtimeFor(wakeHHMM: string | null, hours = BEDTIME_FOR_HOURS): string {
  const m = (wakeHHMM ?? '07:00').match(/^(\d{1,2}):(\d{2})$/);
  const wake = m ? Number(m[1]) * 60 + Number(m[2]) : 7 * 60;
  const bed = (((wake - hours * 60) % 1440) + 1440) % 1440;
  const rounded = Math.round(bed / 15) * 15 % 1440;
  const h = Math.floor(rounded / 60);
  const min = String(rounded % 60).padStart(2, '0');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${h >= 12 ? 'PM' : 'AM'}`;
}

/**
 * The one line under the recovery score: what to do today. Rules, in order: sleep was short and a session is planned,
 * recovery is low, recovery is high with a session, a rest-day line, else a plain nudge.
 */
export function todayAction(i: {
  band: 'Low' | 'Moderate' | 'High' | null;
  sleepHours: number | null;
  sessionFocus: string | null;
  sessionLighter: boolean;
  wakeHHMM: string | null;
}): string {
  const bed = bedtimeFor(i.wakeHHMM);
  const short = i.sleepHours !== null && i.sleepHours < 6.5;
  if (short && i.sessionFocus) {
    return `${i.sessionFocus} is ${i.sessionLighter ? 'already lighter' : 'still on'}. In bed by ${bed} and tomorrow climbs back.`;
  }
  if (i.band === 'Low') return i.sessionFocus ? `Take ${i.sessionFocus.toLowerCase()} easy and aim for bed by ${bed}.` : `Rest today and aim for bed by ${bed}.`;
  if (i.band === 'High' && i.sessionFocus) return `You are well recovered. ${i.sessionFocus} is a good one to push.`;
  if (!i.sessionFocus) return `Rest day. A walk and bed by ${bed} keeps recovery climbing.`;
  if (i.sleepHours === null) return 'Log last night’s sleep and recovery gets sharper.';
  return `Keep ${i.sessionFocus.toLowerCase()} as planned and be in bed by ${bed}.`;
}

export interface WeightPoint {
  weightKg: number;
  loggedAt: string;
}

export interface WeightTrend {
  latest: number;
  /** Change over the last 4 weeks (latest minus the earliest entry in that window), null with one entry. */
  deltaKg: number | null;
  /** Points oldest first, for the sparkline. */
  points: number[];
}

export function weightTrend(logs: WeightPoint[], now: Date = new Date()): WeightTrend | null {
  if (logs.length === 0) return null;
  const sorted = [...logs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const since = now.getTime() - 28 * 86_400_000;
  const window = sorted.filter((l) => new Date(l.loggedAt).getTime() >= since);
  const latest = sorted[sorted.length - 1].weightKg;
  const first = window[0];
  const deltaKg = window.length >= 2 ? Math.round((latest - first.weightKg) * 10) / 10 : null;
  return { latest, deltaKg, points: (window.length >= 2 ? window : sorted.slice(-6)).map((l) => l.weightKg) };
}

export function weightDeltaText(deltaKg: number | null): string {
  if (deltaKg === null) return 'log again to see a trend';
  if (deltaKg === 0) return 'no change in 4 weeks';
  return `${deltaKg > 0 ? '+' : '−'}${Math.abs(deltaKg)} kg in 4 weeks`;
}

/** A weight someone could plausibly type: 20 to 400 kg, one decimal. */
export function parseWeight(text: string): number | null {
  const v = Number(text.replace(',', '.').trim());
  if (!Number.isFinite(v) || v <= 20 || v >= 400) return null;
  return Math.round(v * 10) / 10;
}

/**
 * Premium F8: a 7-day moving average of the weight, so a heavy dinner or a salty day does not look like a change.
 * One value per logged day (the last entry of a day), each averaged with the entries in the 7 days up to it.
 * `days` is how far back to read; returns oldest first.
 */
export function smoothedWeights(logs: WeightPoint[], days = 60, now: Date = new Date()): { day: string; raw: number; avg: number }[] {
  const since = now.getTime() - days * 86_400_000;
  const byDay = new Map<string, { t: number; kg: number }>();
  for (const l of logs) {
    const t = new Date(l.loggedAt).getTime();
    if (t < since) continue;
    const d = new Date(t);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const prev = byDay.get(key);
    if (!prev || t > prev.t) byDay.set(key, { t, kg: l.weightKg });
  }
  const points = [...byDay.entries()].map(([day, v]) => ({ day, t: v.t, raw: v.kg })).sort((a, b) => a.t - b.t);
  return points.map((p) => {
    const window = points.filter((q) => q.t <= p.t && q.t > p.t - 7 * 86_400_000);
    const avg = window.reduce((s, q) => s + q.raw, 0) / window.length;
    return { day: p.day, raw: p.raw, avg: Math.round(avg * 10) / 10 };
  });
}
