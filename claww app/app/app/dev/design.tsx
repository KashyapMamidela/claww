import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AREA_COLORS, COLORS, FONT, BG, bg } from '../../lib/theme';
import { SHOW_DEV_TOOLS } from '../../lib/devTools';
import { riseIn } from '../../lib/motion';
import { setDone, success } from '../../lib/haptics';
import { Display, Heading, Title, Body } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Hero } from '../../components/ui/Hero';
import { Icon } from '../../components/ui/Icon';
import { PenMark } from '../../components/ui/PenMark';
import { PressScale } from '../../components/ui/PressScale';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Segmented } from '../../components/ui/Segmented';
import { Skeleton } from '../../components/ui/Skeleton';
import { StateView } from '../../components/ui/StateView';
import { Stepper } from '../../components/ui/Stepper';
import { Surface } from '../../components/ui/Surface';
import { TickButton } from '../../components/ui/TickButton';
import { TintTile } from '../../components/ui/TintTile';
import { Well } from '../../components/ui/Well';

// NG PHASE 1: every design-system part in every state, to compare on a phone with
// nextgen/design/screens/20-design-system.jpg and 19-states.jpg. Dev and preview builds only
// (Settings > Test tools > Design system); production builds redirect away.

function Section({ title, index, children }: { title: string; index: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={riseIn(index)} style={{ gap: 12 }}>
      <SectionLabel color={COLORS.fgGray}>{title}</SectionLabel>
      {children}
    </Animated.View>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <View style={{ width: '23%', gap: 4 }}>
      <View style={{ height: 40, borderRadius: 10, backgroundColor: hex, borderWidth: 1, borderColor: COLORS.border }} />
      <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: BG[400] }} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

export default function DesignGallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [seg, setSeg] = useState<'one' | 'two' | 'three'>('one');
  const [kg, setKg] = useState(60);
  const [reps, setReps] = useState(8);
  const [chip, setChip] = useState('Gym');
  const [heroKey, setHeroKey] = useState(0);

  if (!SHOW_DEV_TOOLS) return <Redirect href="/settings" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, gap: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <PressScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-left" size={22} color={COLORS.fg} />
          </View>
        </PressScale>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Test tools · not in release builds</Text>
      </View>

      <View style={{ gap: 6 }}>
        <Display>Same app. More depth.</Display>
        <Body color={COLORS.textMuted}>Every part of the NG design system, in every state.</Body>
      </View>

      <Section title="TYPE" index={0}>
        <Display>Display 28 / 900</Display>
        <Heading>Heading 21 / 800</Heading>
        <Title>Title 14 / 700</Title>
        <Body>Body 13 / 500. The coach line and descriptions.</Body>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[500] }}>Small 12 / 500, textMuted</Text>
        <Text style={{ color: COLORS.textFaint, fontSize: 13, fontFamily: BG[400] }}>textFaint, for struck-through old values</Text>
      </Section>

      <Section title="COLOURS · DATA ONLY" index={1}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(AREA_COLORS).map(([name, hex]) => (
            <Swatch key={name} name={name} hex={hex} />
          ))}
          <Swatch name="ratingGood" hex={COLORS.ratingGood} />
          <Swatch name="ratingOkay" hex={COLORS.ratingOkay} />
          <Swatch name="ratingPoor" hex={COLORS.ratingPoor} />
          <Swatch name="textMuted" hex={COLORS.textMuted} />
        </View>
      </Section>

      <Section title="SURFACES" index={2}>
        <Surface>
          <Title>Card</Title>
          <Body color={COLORS.textMuted}>Grain, top light, soft shadow.</Body>
        </Surface>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TintTile color={AREA_COLORS.steps} watermark="footprints" style={{ flex: 1 }}>
            <Text style={{ color: AREA_COLORS.steps, fontSize: 11, letterSpacing: 0.9, fontFamily: BG[800] }}>STEPS</Text>
            <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800], fontVariant: ['tabular-nums'] }}>6,482</Text>
          </TintTile>
          <TintTile color={AREA_COLORS.streak} watermark="zap" style={{ flex: 1 }}>
            <Text style={{ color: AREA_COLORS.streak, fontSize: 11, letterSpacing: 0.9, fontFamily: BG[800] }}>STREAK</Text>
            <Text style={{ color: COLORS.fg, fontSize: 22, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>5 days</Text>
          </TintTile>
        </View>
        <Hero key={`blue-${heroKey}`}>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, letterSpacing: 1, fontFamily: BG[800] }}>YOUR PLAN · DAY 3 OF 4</Text>
          <Heading>Push day</Heading>
          <Body color="rgba(255,255,255,0.8)">Hero: app gradient, lines, one sheen on mount.</Body>
        </Hero>
        <Hero key={`green-${heroKey}`} variant="green">
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, letterSpacing: 1, fontFamily: BG[800] }}>NEXT ON YOUR PLAN · DINNER</Text>
          <Heading>Egg bhurji + 2 roti</Heading>
        </Hero>
        <Button variant="ghost" size="sm" onPress={() => setHeroKey((k) => k + 1)}>
          Replay the sheen
        </Button>
        <Well padding={14}>
          <Body color={COLORS.fgGray}>Well: the inset area behind steppers, segments and reasons.</Body>
        </Well>
      </Section>

      <Section title="BUTTONS AND CHIPS" index={3}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button accent={COLORS.blue} accentDeep={COLORS.blueDeep}>Primary</Button>
          <Button accent={COLORS.green} accentDeep={COLORS.greenDeep}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="inverted">Inverted</Button>
          <Button disabled>Disabled</Button>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['Gym', 'Home, with dumbbells', 'No equipment'].map((c) => (
            <Chip key={c} active={chip === c} onPress={() => setChip(c)}>
              {c}
            </Chip>
          ))}
        </View>
        <Segmented
          value={seg}
          onChange={setSeg}
          accessibilityLabel="Example segmented control"
          options={[
            { value: 'one', label: 'Segment' },
            { value: 'two', label: 'Two' },
            { value: 'three', label: 'Three' },
          ]}
        />
      </Section>

      <Section title="STEPPERS AND TICKS" index={4}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Stepper label="Weight" value={String(kg)} unit="kg" onDecrement={() => setKg((v) => Math.max(0, v - 2.5))} onIncrement={() => setKg((v) => v + 2.5)} decrementDisabled={kg <= 0} />
          </View>
          <View style={{ flex: 1 }}>
            <Stepper label="Reps" value={String(reps)} unit="reps" onDecrement={() => setReps((v) => Math.max(1, v - 1))} onIncrement={() => setReps((v) => v + 1)} decrementDisabled={reps <= 1} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TickButton state="done" accessibilityLabel="Set 1 done" />
          <TickButton state="current" onPress={setDone} accessibilityLabel="Log set 2 as planned" />
          <TickButton state="pending" onPress={() => {}} accessibilityLabel="Set 3, not yet" />
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400], flex: 1 }}>done · current · pending</Text>
        </View>
      </Section>

      <Section title="THE COACH'S PEN" index={5}>
        <Surface>
          <View style={{ gap: 18 }}>
            <PenMark area="workout" context="Push day" item="Bench press" oldValue="62.5" newValue="60 kg" note="short sleep, hold this week" reason="You slept 6 h 10 min and chest recovery is 58. Holding 60 kg keeps the progress; it goes up to 62.5 next Thursday if sleep is back." useOldLabel="Use 62.5 kg" />
            <PenMark area="nutrition" context="Breakfast" item="Breakfast" oldValue="Poha" newValue="Poha + 2 eggs" note="protein was short yesterday" reason="Yesterday ended 31 g under your protein target. Two boiled eggs add 12 g for about ₹14." />
          </View>
        </Surface>
        <Surface>
          <PenMark compact area="workout" item="Bench press" oldValue="62.5 kg" newValue="60 kg" note="short sleep, hold this week" reason="Compact mode, for the player's target card." />
        </Surface>
      </Section>

      <Section title="STATES" index={6}>
        <StateView
          variant="first-day"
          label="DAY 0"
          title="Hi Kashyap. Your plan starts tomorrow."
          body="Today, just one thing: log dinner so tomorrow's meals fit you."
          accent={COLORS.green}
          accentDeep={COLORS.greenDeep}
          primary={{ label: 'Log tonight’s dinner', onPress: () => {} }}
        />
        <StateView variant="offline" />
        <View style={{ gap: 8 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Loading: skeletons in the real layout</Text>
          <Skeleton height={18} width="45%" />
          <Skeleton height={120} />
        </View>
        <StateView
          variant="error"
          title="Couldn’t refresh today’s plan"
          body="You’re seeing the plan saved at 7:40 AM. Nothing is lost."
          primary={{ label: 'Try again', onPress: () => {} }}
          secondary={[{ label: 'Keep using saved plan', onPress: () => {} }]}
        />
        <StateView
          variant="empty"
          label="FOOD DIARY · TODAY"
          title="Nothing logged yet"
          body="Breakfast on your plan was poha + 2 eggs. Did you have it?"
          accent={COLORS.green}
          accentDeep={COLORS.greenDeep}
          primary={{ label: 'Yes, as planned', onPress: () => {} }}
          secondary={[
            { label: 'Something else', onPress: () => {} },
            { label: 'Skipped', onPress: () => {} },
          ]}
        />
      </Section>

      <Section title="HAPTICS" index={7}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button variant="secondary" size="sm" onPress={setDone}>
            Set done (light)
          </Button>
          <Button variant="secondary" size="sm" onPress={success}>
            Success
          </Button>
        </View>
      </Section>
    </ScrollView>
  );
}
