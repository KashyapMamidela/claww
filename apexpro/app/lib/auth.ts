import { supabase } from './supabase';
import type { AuthError, User } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthResult {
  user: User | null;
  error: AuthError | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new user with email and password.
 * Supabase will send a confirmation email if email verification is enabled.
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, error };
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
      redirectTo: 'apexpro://auth/callback',
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
