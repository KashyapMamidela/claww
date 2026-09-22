import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { signIn, signInWithGoogle } from '../../../lib/auth';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { GoogleSignInButton } from '../../../components/GoogleSignInButton';

const A = COLORS.fg;

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const canSubmit = email.trim().length > 3 && password.length > 0 && !loading;

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email.trim(), password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      shake();
      return;
    }
    // Session now exists — the root layout's auth listener routes to
    // onboarding or the tab app depending on onboarding completion.
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError(null);
    const { error: googleError } = await signInWithGoogle();
    setGoogleLoading(false);
    if (googleError) {
      setError(googleError.message);
      shake();
    }
    // Success: same as email sign-in, the root layout's auth listener
    // routes onward once the session is set.
  };

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
            Welcome back
          </Text>
          <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, marginBottom: 30, lineHeight: 19, fontFamily: FONT, textAlign: 'center' }}>
            Sign in to pick up where you left off.
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
              placeholder="Password"
              placeholderTextColor="#52525B"
              secureTextEntry
              textContentType="password"
              style={inputStyle(password.length > 0)}
              onSubmitEditing={handleSubmit}
            />
          </Animated.View>

          <TouchableOpacity onPress={() => router.push('/screens/auth/forgot-password')} style={{ alignSelf: 'flex-end', marginTop: 10 }}>
            <Text style={{ color: COLORS.fgGrayDim, fontSize: 12.5, fontFamily: FONT }}>Forgot password?</Text>
          </TouchableOpacity>

          {error ? (
            <Animated.View entering={FadeInDown.duration(220)}>
              <Text style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 12, fontFamily: FONT }}>{error}</Text>
            </Animated.View>
          ) : null}

          <View style={{ marginTop: 20 }}>
            <Button variant="inverted" size="lg" fullWidth disabled={!canSubmit} onPress={handleSubmit}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <Text style={{ color: '#52525B', fontSize: 11, fontFamily: FONT }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </View>

          <GoogleSignInButton onPress={handleGoogleSignIn} loading={googleLoading} />

          <TouchableOpacity onPress={() => router.replace('/screens/auth/sign-up')} style={{ alignSelf: 'center', paddingVertical: 12, marginTop: 8 }}>
            <Text style={{ color: COLORS.fgGrayDim, fontSize: 13, fontFamily: FONT }}>
              New to CLAWW? <Text style={{ color: A, fontWeight: '700' }}>Create an account</Text>
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
  backgroundColor: COLORS.card,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.28)',
};

function inputStyle(active: boolean) {
  return {
    height: 54,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    fontFamily: FONT,
  };
}
