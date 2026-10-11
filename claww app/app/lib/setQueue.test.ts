import { describe, expect, it } from 'vitest';
import { classifyInsertError, createSetQueue, MAX_QUEUE, type QueuedSet, type QueueStorage, type SendResult, type SetPayload } from './setQueue';

function memoryStorage(initial: QueuedSet[] = []): QueueStorage & { saved: QueuedSet[] } {
  const store = { saved: initial.map((x) => ({ ...x })) };
  return {
    get saved() {
      return store.saved;
    },
    async load() {
      return store.saved.map((x) => ({ ...x }));
    },
    async save(items) {
      store.saved = items.map((x) => ({ ...x }));
    },
  };
}

const payload = (n: number): SetPayload => ({
  user_id: 'u1',
  exercise_id: null,
  exercise_name: `Ex ${n}`,
  sets: 1,
  reps_prescribed: 10,
  reps_achieved: 10,
  weight_prescribed: 0,
  weight_achieved: 0,
  completed_at: '2026-10-11T10:00:00.000Z',
});

describe('createSetQueue', () => {
  it('sends immediately when online and leaves nothing queued', async () => {
    const storage = memoryStorage();
    const sent: string[] = [];
    const q = createSetQueue(storage, async (it) => {
      sent.push(it.clientId);
      return 'inserted';
    });
    await q.enqueue('a', payload(1));
    expect(sent).toEqual(['a']);
    expect(await q.pending()).toBe(0);
    expect(storage.saved).toEqual([]);
  });

  it('keeps sets queued and persisted while offline, then flushes them in order', async () => {
    const storage = memoryStorage();
    let online = false;
    const sent: string[] = [];
    const q = createSetQueue(storage, async (it) => {
      if (!online) return 'retry';
      sent.push(it.clientId);
      return 'inserted';
    });
    await q.enqueue('a', payload(1));
    await q.enqueue('b', payload(2));
    expect(await q.pending()).toBe(2);
    expect(storage.saved.map((x) => x.clientId)).toEqual(['a', 'b']);
    expect(storage.saved[0].attempts).toBeGreaterThan(0);

    online = true;
    await q.flush();
    expect(sent).toEqual(['a', 'b']);
    expect(await q.pending()).toBe(0);
  });

  it('survives a restart: a new queue on the same storage sends what was left', async () => {
    const storage = memoryStorage();
    const offline = createSetQueue(storage, async () => 'retry');
    await offline.enqueue('a', payload(1));

    const sent: string[] = [];
    const restarted = createSetQueue(storage, async (it) => {
      sent.push(it.clientId);
      return 'inserted';
    });
    await restarted.flush();
    expect(sent).toEqual(['a']);
    expect(storage.saved).toEqual([]);
  });

  it('never queues the same client id twice', async () => {
    const storage = memoryStorage();
    const q = createSetQueue(storage, async () => 'retry');
    await q.enqueue('a', payload(1));
    await q.enqueue('a', payload(1));
    expect(await q.pending()).toBe(1);
  });

  it('drops duplicates and rejected data without calling onInserted', async () => {
    const inserted: string[] = [];
    const results: Record<string, SendResult> = { a: 'duplicate', b: 'drop', c: 'inserted' };
    const q = createSetQueue(memoryStorage(), async (it) => results[it.clientId], (it) => inserted.push(it.clientId));
    await q.enqueue('a', payload(1));
    await q.enqueue('b', payload(2));
    await q.enqueue('c', payload(3));
    expect(inserted).toEqual(['c']);
    expect(await q.pending()).toBe(0);
  });

  it('skips an item it cannot send yet but keeps going with the rest', async () => {
    const storage = memoryStorage([
      { clientId: 'other-user', payload: payload(1), attempts: 0 },
      { clientId: 'mine', payload: payload(2), attempts: 0 },
    ]);
    const sent: string[] = [];
    const q = createSetQueue(storage, async (it) => {
      if (it.clientId === 'other-user') return 'skip';
      sent.push(it.clientId);
      return 'inserted';
    });
    await q.flush();
    expect(sent).toEqual(['mine']);
    expect(storage.saved.map((x) => x.clientId)).toEqual(['other-user']);
  });

  it('treats a throwing sender as a transient failure', async () => {
    const q = createSetQueue(memoryStorage(), async () => {
      throw new Error('boom');
    });
    await q.enqueue('a', payload(1));
    expect(await q.pending()).toBe(1);
  });

  it('runs one flush at a time', async () => {
    let calls = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const q = createSetQueue(memoryStorage([{ clientId: 'a', payload: payload(1), attempts: 0 }]), async () => {
      calls += 1;
      await gate;
      return 'inserted';
    });
    const f1 = q.flush();
    const f2 = q.flush();
    release();
    await Promise.all([f1, f2]);
    expect(calls).toBe(1);
  });

  it('caps the queue so it cannot grow forever', async () => {
    const q = createSetQueue(memoryStorage(), async () => 'retry');
    for (let i = 0; i < MAX_QUEUE + 3; i++) await q.enqueue(`id-${i}`, payload(i));
    expect(await q.pending()).toBe(MAX_QUEUE);
  });
});

describe('classifyInsertError', () => {
  it('retries when there was no database answer', () => {
    expect(classifyInsertError({ message: 'Network request failed' })).toBe('retry');
  });

  it('retries auth, RLS and missing-schema errors', () => {
    for (const code of ['PGRST301', '42501', '42703', '42P10', 'PGRST204', '08006', '57P01']) {
      expect(classifyInsertError({ code })).toBe('retry');
    }
  });

  it('drops genuine data rejections', () => {
    expect(classifyInsertError({ code: '23502' })).toBe('drop');
    expect(classifyInsertError({ code: '22P02' })).toBe('drop');
  });
});
