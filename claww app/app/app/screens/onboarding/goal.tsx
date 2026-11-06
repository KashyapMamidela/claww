import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT, FONT_HAND } from '../../../lib/theme';
import { GOAL_OPTIONS, type GoalChoice } from '../../../lib/onboardingChoices';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { TintTile } from '../../../components/ui/TintTile';
import { Surface } from '../../../components/ui/Surface';
import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { PressScale } from '../../../components/ui/PressScale';

// Polish step 2, onboarding 1 (board "Goal"): one choice, the goal first. The picked card glows in its own colour.
export default function OnboardingGoal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name: string; age: string; gender: string }>();
  const [pick, setPick] = useState<GoalChoice>('muscle');
  const picked = GOAL_OPTIONS.find((g) => g.id === pick)!;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OnboardingTopBar step={3} totalSteps={6} accent={picked.color} showBack />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>Set up your plan · step 1 of 4 · about a minute</Text>
          <Text style={{ color: COLORS.fg, fontSize: 32, fontWeight: '900', letterSpacing: -0.8, lineHeight: 38, fontFamily: FONT }}>What's your goal?</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 22, fontFamily: FONT }}>Pick the one that matters most right now. You can change it any time.</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }} accessibilityRole="radiogroup">
          {GOAL_OPTIONS.map((g, i) => {
            const on = g.id === pick;
            const wide = i === GOAL_OPTIONS.length - 1;
            const body = (
              <View style={{ gap: 8, minHeight: wide ? 0 : 108 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Icon name={g.icon} size={22} color={on ? COLORS.fg : g.color} />
                  {on ? (
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: g.color, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={14} color={COLORS.bg} strokeWidth={3} />
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{g.title}</Text>
                <Text style={{ color: on ? 'rgba(255,255,255,0.75)' : COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: FONT }}>{g.line}</Text>
              </View>
            );
            return (
              <PressScale
                key={g.id}
                onPress={() => setPick(g.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${g.title}. ${g.line}`}
                style={{ flexBasis: wide ? '100%' : '47.5%', flexGrow: 1 }}
              >
                {on ? <TintTile color={g.color} padding={14}>{body}</TintTile> : <Surface padding={14}>{body}</Surface>}
              </PressScale>
            );
          })}
        </View>

        <Text style={{ color: COLORS.pen, fontSize: 22, fontFamily: FONT_HAND, textAlign: 'center' }}>{picked.note}</Text>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push({ pathname: '/screens/onboarding/train', params: { ...params, goalChoice: pick } })}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
