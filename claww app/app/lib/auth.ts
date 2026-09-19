import { supabase } from './supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthResult {
  user: User | null;
  error: AuthError | null;
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
 * Sign in with Google using Supabase OAuth.
 * Requires Google OAuth provider to be configured in the Supabase dashboard.
 * On mobile, this opens a browser-based OAuth flow.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'claww://auth/callback',
    },
  });

  // OAuth flow redirects; user object resolves after callback
  return { user: null, error };
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
