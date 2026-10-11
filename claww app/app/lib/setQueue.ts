// Offline-first set logging (V2 PHASE 2.5; absorbs SHIP PHASE 10.3). Every
// set is written to a local queue first and sent from there, so bad gym
// signal can never lose one. Each item carries a client-generated id and
// the insert ignores duplicates on it, so retrying is always safe. Pure and
// storage/network-agnostic so Vitest can test it; lib/setQueueRuntime.ts
// binds it to AsyncStorage and Supabase.

export interface SetPayload {
  user_id: string;
  exercise_id: string | null;
  exercise_name: string;
  sets: number; // set NUMBER within the exercise
  reps_prescribed: number;
  reps_achieved: number;
  weight_prescribed: number;
  weight_achieved: number;
  /** When the set was actually done on the phone — kept so a late flush doesn't move it to the wrong day. */
  completed_at: string;
}

export interface QueuedSet {
  clientId: string;
  payload: SetPayload;
  attempts: number;
}

/**
 * - inserted: saved now.
 * - duplicate: already saved by an earlier attempt (safe to drop).
 * - retry: transient (network, auth, schema not ready) — stop and try the whole queue later.
 * - skip: can't send this one right now (e.g. a different signed-in user) — keep it, try the next.
 * - drop: the server rejected the data itself — retrying would fail forever.
 */
export type SendResult = 'inserted' | 'duplicate' | 'retry' | 'skip' | 'drop';

export interface QueueStorage {
  load(): Promise<QueuedSet[]>;
  save(items: QueuedSet[]): Promise<void>;
}

export interface SetQueue {
  enqueue(clientId: string, payload: SetPayload): Promise<void>;
  flush(): Promise<void>;
  pending(): Promise<number>;
}

/** Keeps the device from growing a queue without bound if something is badly wrong. */
export const MAX_QUEUE = 1000;

export function createSetQueue(
  storage: QueueStorage,
  send: (item: QueuedSet) => Promise<SendResult>,
  onInserted?: (item: QueuedSet) => void
): SetQueue {
  let items: QueuedSet[] | null = null;
  let flushing: Promise<void> | null = null;
  // Writes go through one chain so a slow save can't overwrite a newer one.
  let writes: Promise<void> = Promise.resolve();

  async function load(): Promise<QueuedSet[]> {
    if (items === null) {
      try {
        items = await storage.load();
      } catch {
        items = [];
      }
    }
    return items;
  }

  function persist(): Promise<void> {
    const snapshot = [...(items ?? [])];
    writes = writes.then(() => storage.save(snapshot)).catch(() => {});
    return writes;
  }

  async function runFlush(): Promise<void> {
    const list = await load();
    let i = 0;
    while (i < list.length) {
      const item = list[i];
      let result: SendResult;
      try {
        result = await send(item);
      } catch {
        result = 'retry';
      }
      if (result === 'inserted' || result === 'duplicate' || result === 'drop') {
        list.splice(i, 1);
        await persist();
        if (result === 'inserted') onInserted?.(item);
        continue;
      }
      item.attempts += 1;
      await persist();
      if (result === 'retry') return;
      i += 1; // skip: leave it queued, move on
    }
  }

  return {
    async enqueue(clientId, payload) {
      const list = await load();
      if (!list.some((it) => it.clientId === clientId)) {
        list.push({ clientId, payload, attempts: 0 });
        if (list.length > MAX_QUEUE) list.splice(0, list.length - MAX_QUEUE);
        await persist();
      }
      await this.flush();
    },
    flush() {
      if (!flushing) {
        flushing = runFlush().finally(() => {
          flushing = null;
        });
      }
      return flushing;
    },
    async pending() {
      return (await load()).length;
    },
  };
}

interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
}

/**
 * Turns a Supabase insert error into a queue decision. No error code means
 * the request never got a database answer (offline, timeout) — retry. Auth
 * problems and "the column/index isn't there yet" are retried too, so an app
 * update that ships before its schema change can't throw sets away. Anything
 * else is a real rejection of the data.
 */
export function classifyInsertError(error: PostgrestLikeError): SendResult {
  const code = error.code ?? '';
  if (!code) return 'retry';
  if (code.startsWith('PGRST3')) return 'retry'; // JWT expired / auth
  if (code === '42703' || code === '42P10' || code === 'PGRST204') return 'retry'; // column or conflict target missing
  if (code === '42501') return 'retry'; // RLS: session not ready yet
  if (code.startsWith('08') || code.startsWith('53') || code.startsWith('57')) return 'retry'; // connection, resources, shutdown
  return 'drop';
}
