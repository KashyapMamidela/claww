import { describe, expect, it } from 'vitest';
import { createSetQueue, type QueuedItem, type SendResult } from './setQueue';
import { insertAttempts, isMissingColumn, mergeById, queuedRows, type WritePayload } from './writeQueue';

const meal = (id: string, extra: Record<string, unknown> = {}): WritePayload => ({
  op: 'insert',
  table: 'meal_logs',
  userId: 'u1',
  row: { id, user_id: 'u1', description: 'Poha', calories: 350, logged_at: '2026-11-05T08:00:00.000Z' },
  optional: extra,
  xp: { amount: 10, reason: 'meal_logged' },
});

function memoryStorage() {
  let saved: QueuedItem<WritePayload>[] = [];
  return {
    async load() {
      return JSON.parse(JSON.stringify(saved)) as QueuedItem<WritePayload>[];
    },
    async save(items: QueuedItem<WritePayload>[]) {
      saved = JSON.parse(JSON.stringify(items));
    },
    get saved() {
      return saved;
    },
  };
}

describe('insert attempts', () => {
  it('tries the full row first and then the core row without the newest columns', () => {
    const p = meal('a', { plan_status: 'as_planned', items: [] }) as Extract<WritePayload, { op: 'insert' }>;
    const a = insertAttempts(p);
    expect(a).toHaveLength(2);
    expect(a[0]).toMatchObject({ id: 'a', plan_status: 'as_planned' });
    expect(a[1]).not.toHaveProperty('plan_status');
    expect(insertAttempts(meal('b') as Extract<WritePayload, { op: 'insert' }>)).toHaveLength(1);
  });
  it('knows a missing-column error', () => {
    expect(isMissingColumn({ code: '42703' })).toBe(true);
    expect(isMissingColumn({ code: 'PGRST204' })).toBe(true);
    expect(isMissingColumn({ code: '23505' })).toBe(false);
    expect(isMissingColumn({})).toBe(false);
  });
});

describe('the write queue', () => {
  it('airplane mode: writes are kept, nothing is lost, and they all send once when the connection returns', async () => {
    const storage = memoryStorage();
    let online = false;
    const sentIds: string[] = [];
    const send = async (item: QueuedItem<WritePayload>): Promise<SendResult> => {
      if (!online) return 'retry';
      if (sentIds.includes(item.clientId)) return 'duplicate';
      sentIds.push(item.clientId);
      return 'inserted';
    };
    const q = createSetQueue<WritePayload>(storage, send);
    await q.enqueue('m1', meal('m1'));
    await q.enqueue('m2', meal('m2'));
    await q.enqueue('w1', { op: 'insert', table: 'water_logs', userId: 'u1', row: { id: 'w1', user_id: 'u1', ml: 250 } });
    expect(await q.pending()).toBe(3);
    expect(await q.has('m1')).toBe(true);
    expect(storage.saved).toHaveLength(3); // on the phone, not only in memory
    online = true;
    await q.flush();
    expect(await q.pending()).toBe(0);
    expect(sentIds).toEqual(['m1', 'm2', 'w1']);
  });
  it('a restart keeps the queue: a new queue over the same storage still has the writes', async () => {
    const storage = memoryStorage();
    const q1 = createSetQueue<WritePayload>(storage, async () => 'retry');
    await q1.enqueue('m1', meal('m1'));
    const q2 = createSetQueue<WritePayload>(storage, async () => 'inserted');
    expect(await q2.pending()).toBe(1);
    await q2.flush();
    expect(await q2.pending()).toBe(0);
  });
  it('queuing the same id twice while it waits keeps one copy (and the server ignores a repeat by id)', async () => {
    const storage = memoryStorage();
    const q = createSetQueue<WritePayload>(storage, async () => 'retry');
    await q.enqueue('m1', meal('m1'));
    await q.enqueue('m1', meal('m1'));
    expect(await q.pending()).toBe(1);
  });
  it('awards XP once, and only for what was really inserted', async () => {
    const storage = memoryStorage();
    const xp: string[] = [];
    let result: SendResult = 'retry';
    const q = createSetQueue<WritePayload>(storage, async () => result, (item) => {
      if (item.payload.op === 'insert' && item.payload.xp) xp.push(item.clientId);
    });
    await q.enqueue('m1', meal('m1'));
    expect(xp).toEqual([]);
    result = 'inserted';
    await q.flush();
    await q.flush();
    expect(xp).toEqual(['m1']);
    await q.enqueue('m2', meal('m2'));
    expect(xp).toEqual(['m1', 'm2']);
  });
  it('a rejected write is dropped and reported, not retried forever', async () => {
    const storage = memoryStorage();
    const dropped: string[] = [];
    const q = createSetQueue<WritePayload>(storage, async () => 'drop', undefined, (item) => dropped.push(item.clientId));
    await q.enqueue('bad', meal('bad'));
    expect(dropped).toEqual(['bad']);
    expect(await q.pending()).toBe(0);
  });
});

describe('reading what is still waiting', () => {
  const items = [
    { payload: meal('m1') },
    { payload: { op: 'insert', table: 'water_logs', userId: 'u1', row: { id: 'w1', user_id: 'u1', ml: 250 } } as WritePayload },
    { payload: { op: 'insert', table: 'meal_logs', userId: 'other', row: { id: 'm9' } } as WritePayload },
    { payload: { op: 'update', table: 'pen_marks', userId: 'u1', id: 'p1', patch: { status: 'kept' } } as WritePayload },
  ];
  it('lists one table for one user and ignores updates', () => {
    expect(queuedRows(items, 'meal_logs', 'u1').map((r) => r.id)).toEqual(['m1']);
    expect(queuedRows(items, 'water_logs', 'u1').map((r) => r.id)).toEqual(['w1']);
  });
  it('merges by id, queued first, without doubling a row the server already has', () => {
    const merged = mergeById([{ id: 'a', n: 1 }, { id: 'b', n: 2 }], [{ id: 'b', n: 99 }, { id: 'c', n: 3 }]);
    expect(merged.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(merged.find((r) => r.id === 'b')?.n).toBe(2);
  });
});
