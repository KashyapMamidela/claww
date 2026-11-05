import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { classifyInsertError, createSetQueue, type QueuedItem, type SendResult } from './setQueue';
import { onSetQueueChange, pendingSetCount } from './setQueueRuntime';
import { insertAttempts, isMissingColumn, mergeById, queuedRows, type InsertTable, type WritePayload } from './writeQueue';

const STORAGE_KEY = 'claww.pendingWrites.v1';

const storage = {
  async load(): Promise<QueuedItem<WritePayload>[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  },
  async save(items: QueuedItem<WritePayload>[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },
};

async function send(item: QueuedItem<WritePayload>): Promise<SendResult> {
  const p = item.payload;
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return 'retry';
  if (session.user.id !== p.userId) return 'skip'; // another account's write waits for that account

  if (p.op === 'update') {
    const { data, error } = await supabase.from(p.table).update(p.patch).eq('id', p.id).eq('user_id', p.userId).select('id');
    if (error) return classifyInsertError(error);
    return data && data.length > 0 ? 'inserted' : 'duplicate';
  }

  const attempts = insertAttempts(p);
  for (let i = 0; i < attempts.length; i++) {
    const { data, error } = await supabase.from(p.table).upsert(attempts[i], { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (error) {
      if (isMissingColumn(error) && i < attempts.length - 1) continue; // an older database: send it without the newest columns
      const result = classifyInsertError(error);
      if (result === 'drop') console.warn(`[Claww] ${p.table} write rejected by the server, dropping it:`, error.message);
      return result;
    }
    return data && data.length > 0 ? 'inserted' : 'duplicate';
  }
  return 'drop';
}

function onInserted(item: QueuedItem<WritePayload>) {
  const p = item.payload;
  if (p.op !== 'insert' || !p.xp) return;
  supabase
    .from('xp_events')
    .insert({ user_id: p.userId, amount: p.xp.amount, reason: p.xp.reason })
    .then(({ error }) => {
      if (error) console.warn('[Claww] Failed to award XP:', error.message);
    });
}

const dropped = new Set<string>();
const queue = createSetQueue<WritePayload>(storage, send, onInserted, (item) => dropped.add(item.clientId));

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** The result of a write: saved now, kept on the phone to send later, or refused by the server. */
export type WriteOutcome = 'saved' | 'queued' | 'failed';

/**
 * Stores the write on the phone, tries to send it at once, and says what happened. 'failed' means the server refused
 * the data itself (nothing to retry); 'queued' means it is safe on the phone and will be sent when a connection returns.
 */
export async function writeOrQueue(clientId: string, payload: WritePayload): Promise<WriteOutcome> {
  await queue.enqueue(clientId, payload);
  notify();
  if (dropped.delete(clientId)) return 'failed';
  return (await queue.has(clientId)) ? 'queued' : 'saved';
}

export function flushPendingWrites(): Promise<void> {
  return queue.flush().then(notify);
}

export async function pendingWrites(): Promise<number> {
  return queue.pending();
}

/** Rows of one table still waiting to be sent, to merge into what the screens read. */
export async function queuedRowsFor(table: InsertTable, userId: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await storage.load();
    return queuedRows(raw, table, userId);
  } catch {
    return [];
  }
}

export { mergeById };

/** Flushes queued writes when signed in, when the network comes back and when the app returns to the foreground. */
export function useWriteQueueFlusher(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;
    flushPendingWrites();
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) flushPendingWrites();
    });
    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') flushPendingWrites();
    });
    return () => {
      unsubscribeNet();
      appSub.remove();
    };
  }, [userId]);
}

/** For the offline banner: is the phone offline, and how many writes (sets included) are waiting. */
export function useOfflineStatus(): { offline: boolean; pending: number } {
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const [a, b] = await Promise.all([queue.pending(), pendingSetCount()]);
      if (alive) setPending(a + b);
    };
    refresh();
    listeners.add(refresh);
    const offSets = onSetQueueChange(refresh);
    const unsub = NetInfo.addEventListener((s) => {
      setOffline(s.isConnected === false);
      refresh();
    });
    return () => {
      alive = false;
      listeners.delete(refresh);
      offSets();
      unsub();
    };
  }, []);
  return { offline, pending };
}
