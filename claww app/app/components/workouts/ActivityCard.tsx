import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AREA_COLORS, COLORS, tint, BG } from '../../lib/theme';
import { ACTIVITIES, ACTIVITY_MINUTES_MAX, ACTIVITY_MINUTES_MIN, ACTIVITY_MINUTES_STEP, DEFAULT_ACTIVITY_MINUTES, OTHER_ACTIVITY_ICON } from '../../lib/activities';
import { logActivity } from '../../lib/data';
import { useActivitySession } from '../../lib/activitySession';
import { elapsedSeconds } from '../../lib/sessionClock';
import { useNow } from '../../lib/useNow';
import { ActivityLogo } from '../activity/ActivityLogo';
import { formatActivityClock } from '../activity/ActivityPlayer';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { ErrorCard } from '../ui/ErrorCard';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { Stepper } from '../ui/Stepper';
import { TintTile } from '../ui/TintTile';

// Activities, in the Steps widget's gold. A sport or a walk is started live (a player with a timer, calories and a
// notification) or logged after the fact. Either way it counts for calories and recovery and never as a missed workout.

const GOLD = AREA_COLORS.activity;
const GOLD_DEEP = '#B45309';
const GOLD_INK = '#2A1700';

/** One activity as a tile: its logo over its name. */
export function ActivityTile({ name, active, onPress, compact = false }: { name: string; active?: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: !!active }} style={{ flex: 1 }}>
      <View
        style={{
          height: compact ? 76 : 92,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? 5 : 8,
          backgroundColor: tint(GOLD, active ? 0.2 : 0.07),
          borderWidth: active ? 2 : 1,
          borderColor: tint(GOLD, active ? 0.85 : 0.2),
        }}
      >
        <ActivityLogo name={name} size={compact ? 26 : 30} color={GOLD} />
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: active ? '#fff' : COLORS.fgGray, fontSize: compact ? 12 : 13, fontFamily: BG[700], paddingHorizontal: 4 }}>{name}</Text>
      </View>
    </PressScale>
  );
}

function rows<T>(items: T[], per: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += per) out.push(items.slice(i, i + per));
  return out;
}

/**
 * Start an activity (live timer) or log one afterwards. `initial` preselects a tile. A running activity shows its own
 * "open the player" row at the top instead of letting a second one start.
 */
export function ActivitySheet({ visible, userId, onClose, onLogged, initial = null }: { visible: boolean; userId: string | null; onClose: () => void; onLogged: (message: string) => void; initial?: string | null }) {
  const { active, start, setMinimised } = useActivitySession();
  const [picked, setPicked] = useState<string | null>(initial);
  const [other, setOther] = useState('');
  const [logMode, setLogMode] = useState(false);
  const [minutes, setMinutes] = useState(DEFAULT_ACTIVITY_MINUTES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = picked === 'Other' ? other.trim() : picked;

  useEffect(() => {
    if (visible) setPicked(initial);
  }, [visible, initial]);

  const reset = () => {
    setPicked(null);
    setOther('');
    setLogMode(false);
    setError(null);
    setMinutes(DEFAULT_ACTIVITY_MINUTES);
  };
  const close = () => {
    reset();
    onClose();
  };
  const begin = () => {
    if (!name) return;
    if (start(name.slice(0, 40))) {
      reset();
      onClose();
    }
  };
  const save = async () => {
    if (!userId || !name || saving) return;
    setSaving(true);
    setError(null);
    const ok = await logActivity(userId, name, minutes);
    setSaving(false);
    if (!ok) {
      setError('Could not log it. Check your connection and try again.');
      return;
    }
    const msg = `Logged ${name} · ${minutes} min`;
    reset();
    onClose();
    onLogged(msg);
  };

  const tiles = [...ACTIVITIES.map((a) => a.name), 'Other'];
  return (
    <BottomSheet visible={visible} onClose={close} maxHeightFraction={0.9}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
        <View>
          <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800] }}>{active ? 'Activity running' : 'Start an activity'}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: BG[400], marginTop: 2 }}>
            {active ? 'Finish it before you start another.' : 'Time it live with calories and a lock-screen player, or log it afterwards.'}
          </Text>
        </View>

        {active ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            accent={GOLD}
            accentDeep={GOLD_DEEP}
            labelColor={GOLD_INK}
            onPress={() => {
              setMinimised(false);
              close();
            }}
            icon={<ActivityLogo name={active.name} size={20} color={GOLD_INK} />}
          >
            {`Open ${active.name}`}
          </Button>
        ) : (
          <>
            <View style={{ gap: 10 }}>
              {rows(tiles, 3).map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  {r.map((n) => (
                    <ActivityTile key={n} name={n} active={picked === n} onPress={() => setPicked(n)} />
                  ))}
                  {Array.from({ length: 3 - r.length }, (_, k) => (
                    <View key={`pad-${k}`} style={{ flex: 1 }} />
                  ))}
                </View>
              ))}
            </View>

            {picked === 'Other' ? (
              <TextInput
                value={other}
                onChangeText={setOther}
                placeholder="What did you play?"
                placeholderTextColor={COLORS.textFaint}
                maxLength={40}
                accessibilityLabel="Activity name"
                style={{ height: 48, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, color: COLORS.fg, fontSize: 17, paddingHorizontal: 14, fontFamily: BG[400] }}
              />
            ) : null}

            {picked ? (
              <View style={{ gap: 6 }}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  accent={GOLD}
                  accentDeep={GOLD_DEEP}
                  labelColor={GOLD_INK}
                  disabled={!name}
                  onPress={begin}
                  icon={<Icon name="play" size={16} color={GOLD_INK} />}
                >
                  {name ? `Start ${name}` : 'Start'}
                </Button>
                {logMode ? (
                  <View style={{ gap: 12, marginTop: 6 }}>
                    <Stepper
                      label="Minutes"
                      value={String(minutes)}
                      unit="min"
                      onDecrement={() => setMinutes((m) => Math.max(ACTIVITY_MINUTES_MIN, m - ACTIVITY_MINUTES_STEP))}
                      onIncrement={() => setMinutes((m) => Math.min(ACTIVITY_MINUTES_MAX, m + ACTIVITY_MINUTES_STEP))}
                      decrementDisabled={minutes <= ACTIVITY_MINUTES_MIN}
                      incrementDisabled={minutes >= ACTIVITY_MINUTES_MAX}
                    />
                    {error ? <ErrorCard message={error} onRetry={save} retrying={saving} /> : null}
                    <Button variant="secondary" size="lg" fullWidth accent={GOLD} saving={saving} disabled={!name} onPress={save}>
                      {`Log ${minutes} min`}
                    </Button>
                  </View>
                ) : (
                  <Button variant="ghost" size="md" fullWidth accent={COLORS.textMuted} onPress={() => setLogMode(true)}>
                    Already played? Log the minutes
                  </Button>
                )}
              </View>
            ) : null}
          </>
        )}
      </View>
    </BottomSheet>
  );
}

/**
 * A gold card with the four most-played activities and a way to see the rest. While one runs it becomes a live row that
 * opens the player. Opens the same sheet as Quick log.
 */
export function ActivityCard({ userId, onLogged }: { userId: string | null; onLogged: (message: string) => void }) {
  const { active, paused, setMinimised } = useActivitySession();
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<string | null>(null);
  const now = useNow(1000, !!active && !paused);
  const quick = ACTIVITIES.slice(0, 4).map((a) => a.name);

  return (
    <TintTile color={GOLD} watermark={active ? undefined : OTHER_ACTIVITY_ICON} watermarkSize={96} padding={16} radius={20}>
      {active ? (
        <PressScale onPress={() => setMinimised(false)} accessibilityRole="button" accessibilityLabel={`${active.name} is running. Open the player`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(GOLD, 0.18) }}>
              <ActivityLogo name={active.name} size={26} color={GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: GOLD, fontSize: 13, fontFamily: BG[800] }}>{paused ? 'Paused' : 'Live now'}</Text>
              <Text numberOfLines={1} style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>{active.name}</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{formatActivityClock(elapsedSeconds(active.clock, now))}</Text>
          </View>
        </PressScale>
      ) : (
        <View style={{ gap: 14 }}>
          <View>
            <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Start an activity</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 20, fontFamily: BG[400], marginTop: 2 }}>Live timer, calories and a lock-screen player.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {quick.map((n) => (
              <ActivityTile key={n} name={n} compact onPress={() => { setInitial(n); setOpen(true); }} />
            ))}
            <PressScale onPress={() => { setInitial(null); setOpen(true); }} accessibilityRole="button" accessibilityLabel="More activities" style={{ flex: 1 }}>
              <View style={{ height: 76, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderStyle: 'dashed', borderColor: tint(GOLD, 0.35) }}>
                <Icon name="plus" size={24} color={GOLD} />
                <Text style={{ color: COLORS.fgGray, fontSize: 12, fontFamily: BG[700] }}>More</Text>
              </View>
            </PressScale>
          </View>
        </View>
      )}
      <ActivitySheet visible={open} userId={userId} initial={initial} onClose={() => setOpen(false)} onLogged={onLogged} />
    </TintTile>
  );
}
