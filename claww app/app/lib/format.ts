// Premium D12 and D13: one way to write dates, times and values with units, so the same thing never reads two ways.
// Pure functions; the thin space (U+2009) keeps a number and its unit together without a full-width gap.

const THIN = ' ';

/** "Sunday 8 Nov". */
export function dayLabel(d: Date): string {
  return `${d.toLocaleDateString('en-GB', { weekday: 'long' })} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`;
}

/** "6:00 pm" in text. */
export function timeLabel(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const pm = h >= 12;
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${pm ? 'pm' : 'am'}`;
}

/** "18:00" for the Today timeline's time column. */
export function clock24(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));
const group = (n: number) => Math.round(n).toLocaleString('en-US');

export const kcal = (n: number) => `${group(n)}${THIN}kcal`;
export const kg = (n: number) => `${trim(n, 1)}${THIN}kg`;
export const grams = (n: number) => `${group(n)}${THIN}g`;
export const steps = (n: number) => group(n);
/** Litres from millilitres: 2000 -> "2 L", 1250 -> "1.25 L". */
export const litres = (ml: number) => `${trim(ml / 1000, 2)}${THIN}L`;
export const hoursText = (h: number) => `${trim(h, 1)}${THIN}h`;

/**
 * A plan day's name for people: blueprints number repeated days ("Push (2)"), which read like code. The second of a
 * kind becomes "Push B", the third "Push C". Data keeps the original name; this is only for display.
 */
export function sessionName(focus: string | null | undefined): string {
  if (!focus) return '';
  return focus.replace(/\s*\((\d)\)\s*$/, (_m, n: string) => ` ${String.fromCharCode(64 + Number(n))}`);
}

/** A whole number with Indian digit grouping: 1542 -> "1,542". */
export function num(n: number | null | undefined): string {
  return Math.round(n ?? 0).toLocaleString('en-IN');
}
