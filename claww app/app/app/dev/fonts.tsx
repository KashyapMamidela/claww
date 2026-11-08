import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../../lib/theme';
import { Surface } from '../../components/ui/Surface';

// Premium X4: three free display fonts on the same Home content, to pick one. Open with claww:///dev/fonts.
// Dev only; delete after the choice.

const OPTIONS = [
  { name: 'Inter (today)', font: FONT, weight: '900' as const },
  { name: 'Bricolage Grotesque', font: 'BricolageGrotesque_800ExtraBold', weight: '400' as const },
  { name: 'Sora', font: 'Sora_800ExtraBold', weight: '400' as const },
  { name: 'Plus Jakarta Sans', font: 'PlusJakartaSans_800ExtraBold', weight: '400' as const },
];

export default function FontsGallery() {
  const insets = useSafeAreaInsets();
  const [loaded] = useFonts({ BricolageGrotesque_800ExtraBold, Sora_800ExtraBold, PlusJakartaSans_800ExtraBold });
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 60, gap: 14 }}>
      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{loaded ? 'Display font options' : 'Loading fonts…'}</Text>
      {OPTIONS.map((o) => (
        <Surface key={o.name} padding={16}>
          <View style={{ gap: 6 }}>
            <Text style={{ color: COLORS.textFaint, fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FONT }}>{o.name.toUpperCase()}</Text>
            <Text style={{ color: COLORS.fg, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, fontFamily: o.font, fontWeight: o.weight }}>Good evening, Kashyap</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
              <Text style={{ color: COLORS.fg, fontSize: 52, lineHeight: 58, letterSpacing: -1.5, fontFamily: o.font, fontWeight: o.weight, fontVariant: ['tabular-nums'] }}>62.5 kg</Text>
              <Text style={{ color: COLORS.fg, fontSize: 30, fontFamily: o.font, fontWeight: o.weight, fontVariant: ['tabular-nums'] }}>2,461 kcal</Text>
            </View>
            <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: o.font, fontWeight: o.weight }}>Full Body Strength &amp; Core</Text>
          </View>
        </Surface>
      ))}
    </ScrollView>
  );
}
