import React from 'react';
import { BackTile } from '../components/ui/BackTile';
import { Surface } from '../components/ui/Surface';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { COLORS, FONT } from '../lib/theme';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';

// SHIP PHASE 8.5 — reads the real version from app config instead of the
// hardcoded "Version 3.4.1 · Build 20240414" string that used to live in
// more.tsx, which had drifted from app.json's actual "1.0.0" and could
// never be trusted again once it did. No build-number field is set in
// app.json yet (EAS's autoIncrement, SHIP PHASE 9.4, will populate one) —
// shown only when it's actually present, never guessed.
function getAppVersionLabel(): string {
  const version = Constants.expoConfig?.version ?? 'dev';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode;
  return buildNumber ? `Version ${version} · Build ${buildNumber}` : `Version ${version}`;
}

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 32, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 }}>
          <BackTile onPress={() => router.back()} />
          <Badge color="#A1A1AA">ABOUT</Badge>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
          <Image source={require('../assets/logo-mark.png')} style={{ width: 56, height: 56 }} resizeMode="contain" />
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', fontFamily: FONT }}>CLAWW</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: FONT }}>{getAppVersionLabel()}</Text>
        </View>

        <Surface radius={16} padding={16}>
          <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 20, fontFamily: FONT }}>
            CLAWW builds your workout and nutrition plans from real constraints — your equipment,
            experience, and injuries — then adapts them to what you actually log, not just what you
            said you'd do.
          </Text>
        </Surface>

        <Text style={{ color: COLORS.textFaint, fontSize: 11, textAlign: 'center', marginTop: 8, fontFamily: FONT }}>
          © 2026 CLAWW. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}
