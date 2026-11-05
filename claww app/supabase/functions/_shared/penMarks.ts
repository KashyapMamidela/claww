// NG PHASE 11.1: the Coach's Pen mark and its lifecycle. A mark is a small, reasoned change drawn on the plan. Pure and
// dependency-free so the app, the Edge Functions and Vitest run the same file.
//
// Limits (build plan 2): at most 3 new marks a day, and 1 active mark per item. Undo restores the exact old value.

export type PenArea = 'workout' | 'nutrition';
export type PenKind = 'change_number' | 'swap_item' | 'add_item' | 'move_day' | 'hold';
export type PenStatus = 'active' | 'kept' | 'undone' | 'expired';

export const MAX_NEW_MARKS_PER_DAY = 3;
export const PEN_KINDS: PenKind[] = ['change_number', 'swap_item', 'add_item', 'move_day', 'hold'];

/** What a mark is about. `key` identifies the item: one active mark per key. */
export interface PenTarget {
  key: string;
  /** What changes: 'weight', 'sets', 'calories', 'meal', 'day', ... */
  field?: string;
  /** The plan date the mark applies to (YYYY-MM-DD), when it is about one day. */
  planDate?: string;
  meal?: string;
  exercise?: string;
  /** Extra data needed to undo exactly (the old template id, the old weekday label, ...). */
  restore?: Record<string, string | number | null>;
}

export interface PenMark {
  id: string;
  area: PenArea;
  kind: PenKind;
  target: PenTarget;
  oldValue: string | null;
  newValue: string;
  /** Handwritten note, 40 characters or fewer. */
  note: string;
  /** One plain line with the numbers behind it. */
  reason: string;
  evidence: Record<string, unknown> | null;
  status: PenStatus;
  createdAt: string;
  decidedAt: string | null;
}

export type NewMark = Omit<PenMark, 'id' | 'status' | 'createdAt' | 'decidedAt'>;

/** Local calendar day key of an ISO time. */
export function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type CreateCheck = { ok: true } | { ok: false; why: 'daily_limit' | 'item_has_active' | 'item_marked_today' | 'note_too_long' };

/** May this mark be created now? 3 new a day (any status), and one per item (not while one is active or made today). */
export function canCreate(existing: PenMark[], candidate: Pick<NewMark, 'target' | 'note'>, nowIso: string): CreateCheck {
  if (candidate.note.length > 40) return { ok: false, why: 'note_too_long' };
  const today = dayKeyOf(nowIso);
  const madeToday = existing.filter((m) => dayKeyOf(m.createdAt) === today);
  if (madeToday.length >= MAX_NEW_MARKS_PER_DAY) return { ok: false, why: 'daily_limit' };
  if (existing.some((m) => m.status === 'active' && m.target.key === candidate.target.key)) return { ok: false, why: 'item_has_active' };
  if (madeToday.some((m) => m.target.key === candidate.target.key)) return { ok: false, why: 'item_marked_today' };
  return { ok: true };
}

/** Adds as many candidates as the limits allow, in order; returns what was created and what was refused. */
export function createWithinLimits(existing: PenMark[], candidates: NewMark[], nowIso: string, makeId: () => string): { created: PenMark[]; refused: { mark: NewMark; why: string }[] } {
  const all = [...existing];
  const created: PenMark[] = [];
  const refused: { mark: NewMark; why: string }[] = [];
  for (const c of candidates) {
    const check = canCreate(all, c, nowIso);
    if (!check.ok) {
      refused.push({ mark: c, why: check.why });
      continue;
    }
    const m: PenMark = { ...c, id: makeId(), status: 'active', createdAt: nowIso, decidedAt: null };
    all.push(m);
    created.push(m);
  }
  return { created, refused };
}

/** Keep or undo an active mark. A decided mark does not change again. */
export function decide(mark: PenMark, status: 'kept' | 'undone', nowIso: string): PenMark {
  if (mark.status !== 'active') return mark;
  return { ...mark, status, decidedAt: nowIso };
}

/** What undoing puts back: the exact old value for the item; null for a hold (nothing was changed). */
export interface UndoPatch {
  area: PenArea;
  kind: PenKind;
  target: PenTarget;
  value: string;
  restore: PenTarget['restore'];
}

export function undoPatch(mark: PenMark): UndoPatch | null {
  if (mark.kind === 'hold' || mark.oldValue === null) return null;
  return { area: mark.area, kind: mark.kind, target: mark.target, value: mark.oldValue, restore: mark.target.restore };
}

/**
 * An active mark expires once its plan date has passed, or once the item is done (the set was logged, the meal eaten).
 * `doneKeys` are the target keys already done.
 */
export function isExpired(mark: PenMark, todayKey: string, doneKeys: ReadonlySet<string>): boolean {
  if (mark.status !== 'active') return false;
  if (mark.target.planDate && mark.target.planDate < todayKey) return true;
  return doneKeys.has(mark.target.key);
}

export function expireMarks(marks: PenMark[], todayKey: string, doneKeys: ReadonlySet<string>, nowIso: string): PenMark[] {
  return marks.map((m) => (isExpired(m, todayKey, doneKeys) ? { ...m, status: 'expired' as const, decidedAt: nowIso } : m));
}

/** Active marks for a plan date (a mark with no date is about the whole week and shows every day). */
export function activeFor(marks: PenMark[], dateKey: string): PenMark[] {
  return marks.filter((m) => m.status === 'active' && (!m.target.planDate || m.target.planDate === dateKey));
}

/** Counts for the weekly review hero. */
export function reviewCounts(marks: PenMark[]): { kept: number; undone: number; active: number } {
  return {
    kept: marks.filter((m) => m.status === 'kept').length,
    undone: marks.filter((m) => m.status === 'undone').length,
    active: marks.filter((m) => m.status === 'active').length,
  };
}
