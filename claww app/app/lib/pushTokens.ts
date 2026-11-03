import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

let registeredToken: string | null = null;

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
}

function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * V2 PHASE 3.4 — saves this device's Expo push token (and its timezone, so
 * the send-reminders function can pick the user's local morning/evening)
 * once notification permission is granted. On Android this needs Firebase
 * (google-services.json + FCM credentials in EAS); until those exist the
 * token call fails and this quietly does nothing — local reminders still
 * work, only server pushes are missing.
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') return;
  const id = projectId();
  if (!id) return;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    registeredToken = token;
    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        timezone: deviceTimezone(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );
    if (error) console.warn('[Claww] Failed to save push token:', error.message);
  } catch (e) {
    console.warn('[Claww] Push token unavailable (FCM not set up yet?):', (e as Error).message);
  }
}

/** Removes this device's push token — called before signing out, so a signed-out phone gets no pushes. */
export async function unregisterPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    let token = registeredToken;
    if (!token) {
      const id = projectId();
      if (!id) return;
      token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    }
    await supabase.from('push_tokens').delete().eq('token', token);
    registeredToken = null;
  } catch {
    // No token on this device (e.g. FCM not configured) — nothing to remove.
  }
}
