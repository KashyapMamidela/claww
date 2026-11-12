import React, { useState } from 'react';
import { BackTile } from '../components/ui/BackTile';
import { Surface } from '../components/ui/Surface';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { COLORS, FONT, BG, bg } from '../lib/theme';
import { Icon } from '../components/ui/Icon';
import { MedicalDisclaimerModal } from '../components/MedicalDisclaimerModal';
import { openSupportEmail } from '../lib/support';

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
  const [disclaimer, setDisclaimer] = useState(false);
  const links = [
    { label: 'Medical disclaimer', icon: 'shield', onPress: () => setDisclaimer(true) },
    { label: 'Contact support', icon: 'mail', onPress: () => openSupportEmail('CLAWW support') },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 32, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 }}>
          <BackTile onPress={() => router.back()} />
          <Text style={{ color: "#fff", fontSize: 28, fontFamily: BG[800] }}>About</Text>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
          <Image source={require('../assets/logo-mark.png')} style={{ width: 56, height: 56 }} resizeMode="contain" />
          <Text style={{ color: '#fff', fontSize: 22, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>CLAWW</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{getAppVersionLabel()}</Text>
        </View>

        <Surface radius={16} padding={16}>
          <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 20, fontFamily: BG[400] }}>
            CLAWW builds your workout and nutrition plans from real constraints — your equipment,
            experience, and injuries — then adapts them to what you actually log, not just what you
            said you'd do.
          </Text>
        </Surface>

        <Surface radius={16} padding={0}>
          {links.map((l, i) => (
            <TouchableOpacity
              key={l.label}
              activeOpacity={0.7}
              onPress={l.onPress}
              accessibilityRole="button"
              style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.border }}
            >
              <Icon name={l.icon} size={18} color={COLORS.textMuted} />
              <Text style={{ flex: 1, color: COLORS.fg, fontSize: 15, fontFamily: BG[500] }}>{l.label}</Text>
              <Icon name="chevron-right" size={16} color={COLORS.textFaint} />
            </TouchableOpacity>
          ))}
        </Surface>

        <Text style={{ color: COLORS.textFaint, fontSize: 11, textAlign: 'center', marginTop: 8, fontFamily: BG[400] }}>
          © 2026 CLAWW. All rights reserved.
        </Text>
      </View>
      <MedicalDisclaimerModal visible={disclaimer} onClose={() => setDisclaimer(false)} />
    </ScrollView>
  );
}
