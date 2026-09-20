import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../../lib/theme';

// SHIP PHASE 8.4 bug fix — signInWithGoogle's redirectTo is
// `claww://auth/callback`. On Android, the OS delivers that redirect both
// to expo-web-browser's openAuthSessionAsync (which resolves the promise
// and establishes the session — see lib/auth.ts) AND, separately, as a
// normal deep link to the app's own router. Without a route registered
// here, expo-router 404s with "Unmatched Route" right as the session
// finishes resolving. This screen exists only to give that deep link
// somewhere real to land; _layout.tsx's auth-state listener replaces away
// from it automatically the moment the session updates.
export default function AuthCallbackScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={COLORS.fgGray} />
      <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, marginTop: 16, fontFamily: FONT }}>Signing in…</Text>
    </SafeAreaView>
  );
}
