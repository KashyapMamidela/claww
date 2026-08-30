import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { signUp, ensureProfileRow } from '../../../lib/auth';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';

const A = COLORS.blue;

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    const { user, session, error: signUpError } = await signUp(email.trim(), password);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      return;
    }

    if (user && !session) {
      // Email confirmation is required on this Supabase project — no
      // session yet, so there's nothing for the root layout to route on.
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    if (user) {
      await ensureProfileRow(user);
    }
    // Session now exists — the root layout's auth listener picks it up
    // and routes to onboarding automatically.
    setLoading(false);
  };

  if (checkEmail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 42, marginBottom: 16 }}>📬</Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8, fontFamily: FONT }}>
          Check your email
        </Text>
        <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: FONT }}>
          We sent a confirmation link to {email.trim()}. Tap it, then come back and sign in.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/screens/auth/sign-in')} style={{ marginTop: 24 }}>
          <Text style={{ color: A, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Go to sign in</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={backButtonStyle}>
          <Icon name="chevron-left" size={18} color="#A1A1AA" />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={logoTileStyle}>
              <Image source={require('../../../assets/logo-mark.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
            </View>
          </View>

          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.6, marginBottom: 8, fontFamily: FONT, textAlign: 'center' }}>
            Create your account
          </Text>
          <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, marginBottom: 30, lineHeight: 19, fontFamily: FONT, textAlign: 'center' }}>
            Takes a minute — you'll set up your profile next.
          </Text>

          <Animated.View style={[{ gap: 12 }, shakeStyle]}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#52525B"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={inputStyle(email.length > 0)}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min. 6 characters)"
              placeholderTextColor="#52525B"
              secureTextEntry
              textContentType="newPassword"
              style={inputStyle(password.length > 0)}
              onSubmitEditing={handleSubmit}
            />
          </Animated.View>

          {error ? (
            <Animated.View entering={FadeInDown.duration(220)}>
              <Text style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 12, fontFamily: FONT }}>{error}</Text>
            </Animated.View>
          ) : null}

          <View style={{ marginTop: 24 }}>
            <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth disabled={!canSubmit} onPress={handleSubmit}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </View>

          <TouchableOpacity onPress={() => router.replace('/screens/auth/sign-in')} style={{ alignSelf: 'center', paddingVertical: 12, marginTop: 8 }}>
            <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, fontFamily: FONT }}>
              Already have an account? <Text style={{ color: A, fontWeight: '700' }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const backButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  backgroundColor: COLORS.card,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.10)',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const logoTileStyle = {
  width: 56,
  height: 56,
  borderRadius: 16,
  backgroundColor: A,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.15)',
  boxShadow: `0px 6px 14px ${A}40`,
};

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
