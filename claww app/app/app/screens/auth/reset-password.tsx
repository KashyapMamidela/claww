import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { COLORS, FONT } from '../../../lib/theme';
import { establishSessionFromUrl, updatePassword } from '../../../lib/auth';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';

const A = COLORS.blue;

type LinkState = 'checking' | 'valid' | 'invalid';

// SHIP PHASE 8.4 — where the password-reset email link actually lands
// (claww://screens/auth/reset-password#access_token=...&type=recovery).
// The tokens are in the URL fragment, which expo-router's normal
// useLocalSearchParams never sees (fragments aren't routing data) — this
// screen reads the raw URL itself and establishes the session from it.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const tryUrl = async (url: string | null) => {
      if (!url || cancelled) return;
      const { handled, error: sessionError } = await establishSessionFromUrl(url);
      if (cancelled) return;
      setLinkState(handled && !sessionError ? 'valid' : 'invalid');
    };

    Linking.getInitialURL().then(tryUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => tryUrl(url));

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const canSubmit = password.length >= 6 && password === confirmPassword && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const { error: updateError } = await updatePassword(password);
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {linkState === 'checking' ? (
            <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, textAlign: 'center', fontFamily: FONT }}>Verifying your link…</Text>
          ) : linkState === 'invalid' ? (
            <View style={{ alignItems: 'center' }}>
              <Icon name="alert-triangle" size={30} color={COLORS.danger} />
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 16, marginBottom: 8, fontFamily: FONT, textAlign: 'center' }}>
                This link has expired
              </Text>
              <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, lineHeight: 19, fontFamily: FONT, textAlign: 'center', maxWidth: 280 }}>
                Password reset links only work once and expire quickly. Request a new one from the sign-in screen.
              </Text>
              <Button
                variant="ghost"
                size="md"
                style={{ marginTop: 20 }}
                onPress={() => router.replace('/screens/auth/sign-in')}
              >
                Back to sign in
              </Button>
            </View>
          ) : done ? (
            <View style={{ alignItems: 'center' }}>
              <Icon name="check-circle-2" size={30} color={COLORS.success} />
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 16, marginBottom: 8, fontFamily: FONT, textAlign: 'center' }}>
                Password updated
              </Text>
              <Button
                variant="primary"
                accent={A}
                accentDeep={COLORS.blueDeep}
                size="md"
                style={{ marginTop: 12 }}
                onPress={() => router.replace('/(tabs)')}
              >
                Continue
              </Button>
            </View>
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.6, marginBottom: 8, fontFamily: FONT, textAlign: 'center' }}>
                Set a new password
              </Text>
              <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, marginBottom: 28, fontFamily: FONT, textAlign: 'center' }}>
                Min. 6 characters.
              </Text>
              <View style={{ gap: 12 }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="New password"
                  placeholderTextColor="#52525B"
                  secureTextEntry
                  textContentType="newPassword"
                  style={inputStyle(password.length > 0)}
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#52525B"
                  secureTextEntry
                  textContentType="newPassword"
                  onSubmitEditing={handleSubmit}
                  style={inputStyle(confirmPassword.length > 0)}
                />
              </View>
              {error ? <Text style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 12, fontFamily: FONT }}>{error}</Text> : null}
              <View style={{ marginTop: 24 }}>
                <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth disabled={!canSubmit} onPress={handleSubmit}>
                  {loading ? 'Updating…' : 'Update password'}
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function inputStyle(active: boolean) {
  return {
    height: 54,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: active ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    fontFamily: FONT,
  };
}
