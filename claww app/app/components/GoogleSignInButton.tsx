import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';

export interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
}

/**
 * SHIP PHASE 8.4 — finishes signInWithGoogle rather than removing it: no
 * brand asset in this codebase, so a plain "G" mark stands in rather than
 * pulling in an icon library just for one logo.
 */
export function GoogleSignInButton({ onPress, loading = false }: GoogleSignInButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={loading}
      style={{
        height: 54,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: COLORS.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#4285F4' }}>G</Text>
        </View>
      )}
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>
        {loading ? 'Signing in…' : 'Continue with Google'}
      </Text>
    </TouchableOpacity>
  );
}
