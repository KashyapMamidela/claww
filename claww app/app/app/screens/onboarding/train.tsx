import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AREA_COLORS, COLORS, FONT, FONT_HAND } from '../../../lib/theme';
import { STYLE_OPTIONS, styleOption, weekPreview, type TrainStyle } from '../../../lib/onboardingChoices';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { TintTile } from '../../../components/ui/TintTile';
import { Surface } from '../../../components/ui/Surface';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { PressScale } from '../../../components/ui/PressScale';

// Polish step 2, onboarding 2 (board "Train"): pick any number of ways to train. A live line shows the week they make.
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function OnboardingTrain() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name: string; age: string; gender: string; goalChoice: string }>();
  // Kept in the order picked: the first is the main style and gets the most days.
  const [picked, setPicked] = useState<TrainStyle[]>(['gym']);
  const preview = weekPreview(picked);

  const toggle = (id: TrainStyle) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OnboardingTopBar step={4} totalSteps={6} accent={AREA_COLORS.workouts} showBack />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>Set up your plan · step 2 of 4 · about a minute</Text>
          <Text style={{ color: COLORS.fg, fontSize: 32, fontWeight: '900', letterSpacing: -0.8, lineHeight: 38, fontFamily: FONT }}>How do you like to train?</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 22, fontFamily: FONT }}>Pick any. We mix them into one week.</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {STYLE_OPTIONS.map((s, i) => {
            const on = picked.includes(s.id);
            const wide = i === STYLE_OPTIONS.length - 1;
            const body = (
              <View style={{ gap: 6, minHeight: wide ? 0 : 96 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Icon name={s.icon} size={22} color={on ? COLORS.fg : s.color} />
                  {on ? (
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: s.color, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={14} color={COLORS.bg} strokeWidth={3} />
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{s.title}</Text>
                <Text style={{ color: on ? 'rgba(255,255,255,0.75)' : COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: FONT }}>{s.line}</Text>
              </View>
            );
            return (
              <PressScale
                key={s.id}
                onPress={() => toggle(s.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${s.title}. ${s.line}`}
                style={{ width: wide ? '100%' : '47.8%' }}
              >
                {on ? <TintTile color={s.color} padding={14}>{body}</TintTile> : <Surface padding={14}>{body}</Surface>}
              </PressScale>
            );
          })}
        </View>

        <Surface padding={16}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>Your week</Text>
          <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', marginTop: 4, fontFamily: FONT }}>{preview.text}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {preview.days.map((d, i) => {
              const color = d ? styleOption(d).color : null;
              return (
                <View
                  key={i}
                  style={{ flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: color ?? 'rgba(255,255,255,0.10)' }}
                  accessibilityLabel={`${DAY_LETTERS[i]}: ${d ? styleOption(d).title : 'rest'}`}
                >
                  <Text style={{ color: color ? COLORS.bg : COLORS.textMuted, fontSize: 13, fontWeight: '800', fontFamily: FONT }}>{DAY_LETTERS[i]}</Text>
                </View>
              );
            })}
          </View>
        </Surface>
        <Text style={{ color: COLORS.pen, fontSize: 22, fontFamily: FONT_HAND, textAlign: 'center' }}>{preview.note}</Text>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={picked.length === 0}
          onPress={() => router.push({ pathname: '/screens/onboarding/reveal', params: { ...params, styles: picked.join(',') } })}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
