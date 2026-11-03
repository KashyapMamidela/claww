import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { classifyInsertError, createSetQueue, type QueuedSet, type SendResult, type SetPayload } from './setQueue';

const STORAGE_KEY = 'claww.pendingSets.v1';

const storage = {
  async load(): Promise<QueuedSet[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  },
  async save(items: QueuedSet[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },
};

async function send(item: QueuedSet): Promise<SendResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return 'retry';
  // A set queued by another account on this phone waits for that account.
  if (session.user.id !== item.payload.user_id) return 'skip';
  const { data, error } = await supabase
    .from('workout_logs')
    .upsert({ ...item.payload, client_id: item.clientId }, { onConflict: 'client_id', ignoreDuplicates: true })
    .select('id');
  if (error) {
    const result = classifyInsertError(error);
    if (result === 'drop') console.warn('[Claww] Set rejected by the server, dropping it:', error.message);
    return result;
  }
  return data && data.length > 0 ? 'inserted' : 'duplicate';
}

// XP for a set is awarded once it's actually saved — matches the optimistic
// bumpXp(5) the player shows the moment Done is tapped.
function onInserted(item: QueuedSet) {
  supabase
    .from('xp_events')
    .insert({ user_id: item.payload.user_id, amount: 5, reason: 'set_completed' })
    .then(({ error }) => {
      if (error) console.warn('[Claww] Failed to award XP:', error.message);
    });
}

const queue = createSetQueue(storage, send, onInserted);

export function newClientId(): string {
  return Crypto.randomUUID();
}

export function enqueueSet(clientId: string, payload: SetPayload): Promise<void> {
  return queue.enqueue(clientId, payload);
}

export function flushPendingSets(): Promise<void> {
  return queue.flush();
}

/** Flushes queued sets when signed in, when the network comes back, and when the app returns to the foreground. */
export function useSetQueueFlusher(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;
    flushPendingSets();
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) flushPendingSets();
    });
    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') flushPendingSets();
    });
    return () => {
      unsubscribeNet();
      appSub.remove();
    };
  }, [userId]);
}
