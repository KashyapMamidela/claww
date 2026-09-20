import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { extractInvokeErrorMessage } from './data';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthResult {
  user: User | null;
  // Google's flow can fail in ways that aren't a Supabase AuthError (a
  // cancelled browser session, a malformed callback URL) — widened rather
  // than forcing every caller to distinguish. Every branch still has
  // `.message`.
  error: AuthError | Error | null;
}

export interface SignUpResult extends AuthResult {
  // Supabase only returns a session immediately if email confirmation is
  // disabled on the project; otherwise this is null until the user confirms.
  session: Session | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new user with email and password.
 * Supabase will send a confirmation email if email verification is enabled.
 */
export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, session: data.session, error };
}

/**
 * Sign in an existing user with email and password.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, error };
}

/**
 * Extracts access_token/refresh_token/type from a Supabase auth redirect URL.
 * Supabase puts them in the URL *fragment* (`#access_token=...`), not the
 * query string — `new URL(url).searchParams` would silently find nothing.
 */
function parseAuthParamsFromUrl(url: string): URLSearchParams {
  const hash = url.split('#')[1];
  if (hash) return new URLSearchParams(hash);
  // Some providers/flows put params in the query string instead — fall back
  // to whatever's after the first '?'.
  const query = url.split('?')[1];
  return new URLSearchParams(query ?? '');
}

/**
 * Establishes a Supabase session from a deep-link URL containing
 * access_token/refresh_token (an OAuth callback or a password-recovery
 * email link — both land here via the app's `claww://` scheme since
 * detectSessionInUrl is off, see lib/supabase.ts). Returns the params so
 * the caller can branch on `type=recovery` vs a normal sign-in.
 */
export async function establishSessionFromUrl(url: string): Promise<{ handled: boolean; params: URLSearchParams; error: AuthError | null }> {
  const params = parseAuthParamsFromUrl(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    return { handled: false, params, error: null };
  }
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  return { handled: true, params, error };
}

/**
 * Sign in with Google via Supabase OAuth. Requires the Google provider to be
 * configured in the Supabase dashboard (client ID/secret live there, not in
 * this app — the app never needs Google credentials directly).
 * Opens the OAuth consent screen in a controlled browser session
 * (expo-web-browser) and waits for the redirect back to the app's own
 * `claww://` scheme, then exchanges the returned tokens for a session.
 * skipBrowserRedirect is required — without it Supabase tries to navigate
 * the current page/webview itself, which doesn't make sense outside a
 * plain web app.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { user: null, error };
  }

  // A blocked popup (web) or a browser-level failure rejects rather than
  // resolving with a result object — caught here so callers always get a
  // normal AuthResult, never an unhandled rejection.
  let result: WebBrowser.WebBrowserAuthSessionResult;
  try {
    result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  } catch (e) {
    return { user: null, error: e instanceof Error ? e : new Error('Could not open the sign-in window.') };
  }
  if (result.type !== 'success' || !('url' in result)) {
    // User closed the browser / cancelled — not an error to surface.
    return { user: null, error: null };
  }

  const { error: sessionError } = await establishSessionFromUrl(result.url);
  if (sessionError) {
    return { user: null, error: sessionError };
  }
  const user = await getCurrentUser();
  return { user, error: null };
}

/**
 * Sends a password-reset email whose link deep-links straight back into the
 * app (screens/auth/reset-password.tsx) via the claww:// scheme, rather than
 * a web page the app doesn't have.
 */
export async function resetPasswordForEmail(email: string): Promise<{ error: AuthError | null }> {
  // Must match reset-password.tsx's real route path exactly — expo-router
  // uses this to navigate to the right screen when the email link opens
  // the app cold.
  const redirectTo = Linking.createURL('screens/auth/reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error };
}

/**
 * Sets a new password for the currently-authenticated session — used from
 * reset-password.tsx after establishSessionFromUrl has already turned the
 * recovery link's tokens into a real (if temporary-purpose) session.
 */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
}

/**
 * Get the currently authenticated user.
 * Returns null if no active session exists.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Sign out the current user and clear the session from SecureStore.
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Permanently deletes the current user's account via the delete-account Edge
 * Function (service role, JWT-scoped to the caller's own id — see
 * supabase/functions/delete-account). Every user_id-scoped row cascades from
 * auth.users(id) ON DELETE CASCADE, so this one call is the whole deletion.
 * The UI-level confirmation (type-to-confirm) must happen before this is
 * called; the Edge Function also requires body.confirm === 'DELETE' as an
 * independent second guard against an accidental/automated call.
 * Signs the local session out on success, since the account it belongs to no
 * longer exists.
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
  if (error) {
    const message = await extractInvokeErrorMessage(error);
    return { error: message ?? error.message ?? 'Failed to delete account.' };
  }
  await supabase.auth.signOut();
  return { error: null };
}

/**
 * Creates the user's `profiles` row if one doesn't already exist yet.
 * Safe to call every time a session appears (sign-up, sign-in, app resume) —
 * `ignoreDuplicates` makes this a no-op if a DB trigger already created the
 * row (see database/schema.sql's `on_auth_user_created` trigger).
 */
export async function ensureProfileRow(user: User): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email ?? '' }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) {
    console.warn('[Claww] Failed to ensure profile row:', error.message);
  }
}

/**
 * Onboarding is considered complete once personalization_profile has been
 * written (the last step of the onboarding flow).
 */
export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('personalization_profile')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[Claww] Failed to check onboarding status:', error.message);
    return false;
  }
  return !!data?.personalization_profile;
}
