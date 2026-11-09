// Premium F2: what the Android home-screen widget shows. Home writes this snapshot whenever its numbers change; the widget
// only reads it, so it never needs the network and opens instantly.

export interface WidgetSnapshot {
  kcal: number;
  kcalTarget: number | null;
  proteinLeft: number | null;
  /** "Push", or null on a rest day */
  session: string | null;
  sessionDone: boolean;
  streak: number;
  updatedAt: number;
}

export const WIDGET_KEY = 'claww.widget.snapshot.v1';

export const EMPTY_SNAPSHOT: WidgetSnapshot = { kcal: 0, kcalTarget: null, proteinLeft: null, session: null, sessionDone: false, streak: 0, updatedAt: 0 };

export interface WidgetLines {
  big: string;
  bigUnit: string;
  protein: string;
  session: string;
  streak: string;
  /** 0..1 */
  fill: number;
}

/** The words on the widget, from a snapshot. Pure, so it is tested. */
export function widgetLines(s: WidgetSnapshot): WidgetLines {
  const kcal = Math.round(s.kcal);
  const hasTarget = s.kcalTarget !== null && s.kcalTarget > 0;
  const fill = hasTarget ? Math.max(0, Math.min(1, s.kcal / (s.kcalTarget as number))) : 0;
  return {
    big: kcal.toLocaleString('en-IN'),
    bigUnit: hasTarget ? `/ ${(s.kcalTarget as number).toLocaleString('en-IN')} kcal` : 'kcal today',
    protein: s.proteinLeft === null ? 'Set your targets to see protein' : s.proteinLeft <= 0 ? 'Protein done for today' : `${Math.round(s.proteinLeft)} g protein left`,
    session: s.session ? (s.sessionDone ? `${s.session} · done` : `${s.session} today`) : 'Rest day',
    streak: s.streak === 1 ? '1 day streak' : `${s.streak} day streak`,
    fill,
  };
}

/** Round to what the widget shows, so an unchanged snapshot is not written again. */
export function sameSnapshot(a: WidgetSnapshot, b: WidgetSnapshot): boolean {
  const p = (v: number | null) => (v === null ? null : Math.round(v));
  return Math.round(a.kcal) === Math.round(b.kcal) && a.kcalTarget === b.kcalTarget && p(a.proteinLeft) === p(b.proteinLeft) && a.session === b.session && a.sessionDone === b.sessionDone && a.streak === b.streak;
}
