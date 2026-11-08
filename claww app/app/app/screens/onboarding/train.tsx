import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AREA_COLORS, COLORS, FONT, FONT_HAND, BG, bg } from '../../../lib/theme';
import { STYLE_OPTIONS, styleOption, toggleWeekday, weekPreview, type TrainStyle } from '../../../lib/onboardingChoices';
import { defaultWeekdays, weekdayIndex } from '../../../lib/trainingWeek';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { TintTile } from '../../../components/ui/TintTile';
import { Surface } from '../../../components/ui/Surface';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { PressScale } from '../../../components/ui/PressScale';

// Polish step 2, onboarding 2 (board "Train"): pick any number of ways to train, then which days. The days are asked
// here once; the setup screens after this use them instead of asking again.
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_DAYS = defaultWeekdays(4).map((d) => weekdayIndex(d) as number);

export default function OnboardingTrain() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name: string; age: string; gender: string; goalChoice: string }>();
  // Kept in the order picked: the first is the main style and gets the most days.
  const [picked, setPicked] = useState<TrainStyle[]>(['gym']);
  const [weekdays, setWeekdays] = useState<number[]>(DEFAULT_DAYS);
  const preview = weekPreview(picked, weekdays);

  const toggle = (id: TrainStyle) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OnboardingTopBar step={4} totalSteps={6} accent={AREA_COLORS.workouts} showBack />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Set up your plan · step 2 of 4 · about a minute</Text>
          <Text style={{ color: COLORS.fg, fontSize: 34, fontVariant: ['tabular-nums'], letterSpacing: -0.8, lineHeight: 38, fontFamily: BG[800] }}>How do you like to train?</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 22, fontFamily: BG[400] }}>Pick any. We mix them into one week.</Text>
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
                <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{s.title}</Text>
                <Text style={{ color: on ? 'rgba(255,255,255,0.75)' : COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: BG[400] }}>{s.line}</Text>
              </View>
            );
            return (
              <PressScale
                key={s.id}
                onPress={() => toggle(s.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${s.title}. ${s.line}`}
                style={{ flexBasis: wide ? '100%' : '47.5%', flexGrow: 1 }}
              >
                {on ? <TintTile color={s.color} padding={14}>{body}</TintTile> : <Surface padding={14}>{body}</Surface>}
              </PressScale>
            );
          })}
        </View>

        <Surface padding={16}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Which days can you train? Tap to change.</Text>
          <Text style={{ color: COLORS.fg, fontSize: 17, marginTop: 4, fontFamily: BG[800] }}>{preview.text}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }} accessibilityRole="radiogroup">
            {DAY_LETTERS.map((letter, i) => {
              const style = preview.days[i];
              const color = style ? styleOption(style).color : null;
              const on = weekdays.includes(i);
              return (
                <PressScale
                  key={i}
                  onPress={() => setWeekdays((w) => toggleWeekday(w, i))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${DAY_NAMES[i]}${on ? ', training' : ', rest'}`}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      height: 44,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: color ?? 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      borderColor: color ? 'transparent' : 'rgba(255,255,255,0.10)',
                    }}
                  >
                    <Text style={{ color: color ? COLORS.bg : COLORS.textMuted, fontSize: 15, fontFamily: BG[800] }}>{letter}</Text>
                  </View>
                </PressScale>
              );
            })}
          </View>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 10, fontFamily: BG[400] }}>
            {weekdays.length} {weekdays.length === 1 ? 'day' : 'days'} a week. Between 2 and 6.
          </Text>
        </Surface>
        <Text style={{ color: COLORS.pen, fontSize: 22, fontFamily: FONT_HAND, textAlign: 'center' }}>{preview.note}</Text>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={picked.length === 0}
          onPress={() => router.push({ pathname: '/screens/onboarding/reveal', params: { ...params, styles: picked.join(','), days: weekdays.join(',') } })}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
