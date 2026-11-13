import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { AREA_COLORS, COLORS, FONT_HAND, BG, tint } from '../../lib/theme';
import { useActivitySession } from '../../lib/activitySession';
import { activityLine, liveActivityKcal } from '../../lib/activities';
import { elapsedSeconds } from '../../lib/sessionClock';
import { useNow } from '../../lib/useNow';
import { ActivityLogo } from './ActivityLogo';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { ProgressRing } from '../ui/ProgressRing';

// The live activity player, themed by the activity: a gold ground, the activity's own logo breathing in the middle of a
// ring, the timer, calories so far and a handwritten line. The ring fills toward the goal when one is set; without a goal
// two soft halos pulse out from the logo. Finish logs the time; the finish moment follows.

const GOLD = AREA_COLORS.activity;
const GOLD_DEEP = '#B45309';
const GOLD_INK = '#2A1700';
const GOALS = [null, 15, 30, 45, 60, 90] as const;

/** 65 -> "1:05", 3725 -> "1:02:05". */
export function formatActivityClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function Halo({ delay, size, active }: { delay: number; size: number; active: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      t.set(0);
      return;
    }
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1)));
  }, [active, delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: (1 - t.get()) * 0.35, transform: [{ scale: 0.82 + t.get() * 0.7 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: GOLD }, style]} />;
}

/** The logo, breathing: 1.0 to 1.07 and back over 3.2 s while the activity runs. */
function Breathing({ active, children }: { active: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (active && !reduced) t.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true));
    else t.set(withTiming(0, { duration: 200 }));
  }, [active, reduced, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.get() * 0.07 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** The ticking pieces, in one component so only this re-renders each second. */
function Live({ ringSize }: { ringSize: number }) {
  const { active, paused, weightKg, setTarget } = useActivitySession();
  const reduced = useReducedMotion();
  const now = useNow(1000, !!active && !paused);
  if (!active) return null;
  const seconds = elapsedSeconds(active.clock, now);
  const kcal = liveActivityKcal(active.name, seconds, weightKg);
  const targetSec = active.targetMin ? active.targetMin * 60 : null;
  const pct = targetSec ? Math.min(100, (seconds / targetSec) * 100) : 0;
  const leftMin = targetSec ? Math.max(0, Math.ceil((targetSec - seconds) / 60)) : null;
  const over = targetSec && seconds > targetSec ? Math.floor((seconds - targetSec) / 60) : 0;
  const nextGoal = () => {
    const i = GOALS.findIndex((g) => g === active.targetMin);
    setTarget(GOALS[(i + 1) % GOALS.length]);
  };
  return (
    <>
      <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
        <Halo size={ringSize - 30} delay={0} active={!paused && !reduced && !targetSec} />
        <Halo size={ringSize - 30} delay={1300} active={!paused && !reduced && !targetSec} />
        <ProgressRing size={ringSize} rings={[{ r: ringSize / 2 - 14, strokeWidth: 10, color: GOLD, pct, track: tint(GOLD, 0.14) }]} trackColor={tint(GOLD, 0.14)}>
          <Breathing active={!paused}>
            <ActivityLogo name={active.name} size={52} color={GOLD} strokeWidth={1.8} />
          </Breathing>
          <Text style={{ color: '#fff', fontSize: 54, lineHeight: 60, letterSpacing: -1.5, fontVariant: ['tabular-nums'], fontFamily: BG[800], marginTop: 6 }} accessibilityLabel={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`}>
            {formatActivityClock(seconds)}
          </Text>
          <Text style={{ color: paused ? GOLD : COLORS.textMuted, fontSize: 13, fontFamily: BG[700] }}>{paused ? 'Paused' : targetSec ? (over > 0 ? `+${over} min over` : `${leftMin} min to go`) : 'Live'}</Text>
        </ProgressRing>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 26 }}>
        <View style={{ flex: 1, borderRadius: 18, padding: 14, backgroundColor: tint(GOLD, 0.08), borderWidth: 1, borderColor: tint(GOLD, 0.2) }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[600] }}>Burned</Text>
          <Text style={{ color: '#fff', fontSize: 28, fontVariant: ['tabular-nums'], fontFamily: BG[800], marginTop: 2 }}>
            {kcal}
            <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[600] }}> kcal</Text>
          </Text>
        </View>
        <PressScale onPress={nextGoal} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={active.targetMin ? `Goal ${active.targetMin} minutes. Tap to change` : 'Set a goal'}>
          <View style={{ borderRadius: 18, padding: 14, backgroundColor: tint(GOLD, 0.08), borderWidth: 1, borderColor: tint(GOLD, 0.2), minHeight: 82 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[600] }}>Goal</Text>
            <Text style={{ color: '#fff', fontSize: 28, fontVariant: ['tabular-nums'], fontFamily: BG[800], marginTop: 2 }}>
              {active.targetMin ? active.targetMin : 'None'}
              {active.targetMin ? <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[600] }}> min</Text> : null}
            </Text>
          </View>
        </PressScale>
      </View>
    </>
  );
}

export function ActivityPlayer() {
  const { active, paused, minimised, setMinimised, togglePause, finish, discard } = useActivitySession();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const visible = !!active && !minimised;

  useEffect(() => {
    if (!active) {
      setBusy(false);
      setError(null);
    }
  }, [active]);

  const onFinish = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const ok = await finish();
    if (!ok) {
      setBusy(false);
      setError('Could not save it. Check your connection and tap Finish again.');
    }
  };

  const name = active?.name ?? '';
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => setMinimised(true)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#0B0904' }}>
        <LinearGradient pointerEvents="none" colors={[tint(GOLD, 0.26), tint(GOLD, 0.06), 'rgba(11,9,4,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 460 }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: -60, bottom: 90, transform: [{ rotate: '-12deg' }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {name ? <ActivityLogo name={name} size={330} color={tint(GOLD, 0.07)} strokeWidth={1.2} /> : null}
        </View>

        <View style={{ flex: 1, paddingTop: insets.top + 6, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PressScale onPress={() => setMinimised(true)} accessibilityRole="button" accessibilityLabel="Minimise. The activity keeps running">
              <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' }}>
                <Icon name="chevron-down" size={22} color={COLORS.fgGray} strokeWidth={2.2} />
              </View>
            </PressScale>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: '#fff', fontSize: 22, fontFamily: BG[800] }}>{name}</Text>
              <Text style={{ color: tint(GOLD, 0.9), fontSize: 20, lineHeight: 22, fontFamily: FONT_HAND, fontWeight: '700' }}>{activityLine(name).toLowerCase()}</Text>
            </View>
          </View>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Live ringSize={268} />
          </View>

          {error ? <Text style={{ color: COLORS.amber, fontSize: 15, textAlign: 'center', marginBottom: 10, fontFamily: BG[600] }}>{error}</Text> : null}
          <View style={{ paddingBottom: Math.max(insets.bottom, 16) + 4, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button variant="secondary" size="lg" fullWidth accent={GOLD} onPress={togglePause} icon={<Icon name={paused ? 'play' : 'pause'} size={17} color={GOLD} />}>
                  {paused ? 'Resume' : 'Pause'}
                </Button>
              </View>
              <View style={{ flex: 1.5 }}>
                <Button variant="primary" size="lg" fullWidth accent={GOLD} accentDeep={GOLD_DEEP} labelColor={GOLD_INK} saving={busy} onPress={onFinish} icon={<Icon name="check" size={18} color={GOLD_INK} strokeWidth={3} />}>
                  Finish
                </Button>
              </View>
            </View>
            <Button variant="ghost" size="md" fullWidth accent={COLORS.textMuted} onPress={() => setConfirmOpen(true)}>
              Discard
            </Button>
          </View>
        </View>
      </View>

      <BottomSheet visible={confirmOpen} onClose={() => setConfirmOpen(false)} maxHeightFraction={0.45}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 10 }}>
          <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800] }}>Discard this activity?</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: BG[400] }}>Nothing will be logged and the timer is gone.</Text>
          <Button variant="secondary" size="lg" fullWidth accent={COLORS.danger} onPress={() => { setConfirmOpen(false); discard(); }}>
            Discard it
          </Button>
          <Button variant="ghost" size="lg" fullWidth onPress={() => setConfirmOpen(false)}>
            Keep going
          </Button>
        </View>
      </BottomSheet>
    </Modal>
  );
}

/** A slim gold bar above the tab bar while an activity runs and the player is minimised. Tap it to open the player. */
export function ActivityMiniBar({ bottomOffset }: { bottomOffset: number }) {
  const { active, paused, minimised, setMinimised, togglePause } = useActivitySession();
  const now = useNow(1000, !!active && !paused && minimised);
  if (!active || !minimised) return null;
  const seconds = elapsedSeconds(active.clock, now);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: bottomOffset }}>
      <PressScale onPress={() => setMinimised(false)} accessibilityRole="button" accessibilityLabel={`${active.name}, ${formatActivityClock(seconds)}${paused ? ', paused' : ''}. Open the player`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 64, paddingLeft: 12, paddingRight: 8, borderRadius: 22, backgroundColor: '#1B1403', borderWidth: 1, borderColor: tint(GOLD, 0.45), boxShadow: '0px 8px 24px rgba(0,0,0,0.55)' } as object}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(GOLD, 0.16) }}>
            <ActivityLogo name={active.name} size={22} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 15, fontFamily: BG[800] }}>{active.name}</Text>
            <Text style={{ color: paused ? GOLD : COLORS.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[600] }}>{paused ? `Paused · ${formatActivityClock(seconds)}` : formatActivityClock(seconds)}</Text>
          </View>
          <PressScale onPress={togglePause} accessibilityRole="button" accessibilityLabel={paused ? 'Resume' : 'Pause'}>
            <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(GOLD, 0.16) }}>
              <Icon name={paused ? 'play' : 'pause'} size={18} color={GOLD} />
            </View>
          </PressScale>
        </View>
      </PressScale>
    </View>
  );
}
