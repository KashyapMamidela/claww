// NG PHASE 14: the generic write queue. The set queue (V2 PHASE 2.5) proved the pattern: every write is stored on the
// phone first, carries a client-generated id, and is sent from there, so a bad signal never loses it. This file is the
// pure part for the other writes (meals, water, sleep, pen decisions); lib/writeQueueRuntime.ts binds it to AsyncStorage
// and Supabase. Inserts use the client id as the row's primary key and ignore duplicates, so retrying is always safe.

export type InsertTable = 'meal_logs' | 'water_logs' | 'sleep_logs';

export type WritePayload =
  | {
      op: 'insert';
      table: InsertTable;
      userId: string;
      /** Always includes `id` (the client id) and `user_id`. */
      row: Record<string, unknown>;
      /** Columns an older database may not have yet: tried with them first, then without. */
      optional?: Record<string, unknown>;
      /** XP to award once the row is actually saved. */
      xp?: { amount: number; reason: string };
    }
  | {
      op: 'update';
      table: 'pen_marks';
      userId: string;
      id: string;
      patch: Record<string, unknown>;
    };

/** The column sets to try for an insert, most complete first. */
export function insertAttempts(p: Extract<WritePayload, { op: 'insert' }>): Record<string, unknown>[] {
  const withOptional = p.optional && Object.keys(p.optional).length > 0 ? [{ ...p.row, ...p.optional }] : [];
  return [...withOptional, p.row];
}

/** True when a database error means "a column is not there yet", so the next, smaller attempt should be tried. */
export function isMissingColumn(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? '';
  return code === '42703' || code === 'PGRST204';
}

/** Rows still waiting to be sent for one table and user (the lists the app reads merge these in so nothing seems lost). */
export function queuedRows(items: { payload: WritePayload }[], table: InsertTable, userId: string): Record<string, unknown>[] {
  return items
    .map((i) => i.payload)
    .filter((p): p is Extract<WritePayload, { op: 'insert' }> => p.op === 'insert' && p.table === table && p.userId === userId)
    .map((p) => ({ ...p.row, ...(p.optional ?? {}) }));
}

/** Newest first, no duplicates by id: server rows plus queued ones. */
export function mergeById<T extends { id: string }>(server: T[], queued: T[]): T[] {
  const seen = new Set(server.map((r) => r.id));
  return [...queued.filter((r) => !seen.has(r.id)), ...server];
}

export const uuidLike = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
