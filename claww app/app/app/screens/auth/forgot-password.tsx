import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { resetPasswordForEmail } from '../../../lib/auth';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';

const A = COLORS.blue;

// SHIP PHASE 8.4 — a user who forgets their password today is permanently
// locked out. resetPasswordForEmail's link deep-links straight back to
// reset-password.tsx via the app's own claww:// scheme.
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().length > 3 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const { error: resetError } = await resetPasswordForEmail(email.trim());
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chevron-left" size={18} color="#A1A1AA" />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {sent ? (
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  backgroundColor: 'rgba(34,197,94,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <Icon name="check-circle-2" size={30} color={COLORS.success} />
              </View>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8, fontFamily: FONT, textAlign: 'center' }}>
                Check your email
              </Text>
              <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, lineHeight: 19, fontFamily: FONT, textAlign: 'center', maxWidth: 280 }}>
                If an account exists for {email.trim()}, a reset link is on its way.
              </Text>
              <TouchableOpacity onPress={() => router.replace('/screens/auth/sign-in')} style={{ marginTop: 24 }}>
                <Text style={{ color: A, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.6, marginBottom: 8, fontFamily: FONT, textAlign: 'center' }}>
                Reset your password
              </Text>
              <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, marginBottom: 28, lineHeight: 19, fontFamily: FONT, textAlign: 'center' }}>
                Enter the email on your account and we'll send a reset link.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#52525B"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                onSubmitEditing={handleSubmit}
                style={{
                  height: 54,
                  backgroundColor: COLORS.card,
                  borderWidth: 1,
                  borderColor: email.length > 0 ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: '600',
                  paddingHorizontal: 16,
                  fontFamily: FONT,
                }}
              />
              {error ? <Text style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 12, fontFamily: FONT }}>{error}</Text> : null}
              <View style={{ marginTop: 24 }}>
                <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth disabled={!canSubmit} onPress={handleSubmit}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
