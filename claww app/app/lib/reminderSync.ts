import { getProfile } from './data';
import { syncRemindersOnStart } from './notifications';

/**
 * The one entry point for (re)scheduling a user's local reminders. Called on
 * every signed-in app start, and whenever something changes what they
 * should say or whether they should fire. Safe to call any number of times.
 */
export async function refreshReminders(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  await syncRemindersOnStart(profile?.notifications_enabled ?? false);
}
