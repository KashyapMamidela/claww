import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AREA_COLORS, COLORS, FONT, tint, BG, bg } from '../../lib/theme';
import type { TodayItem } from '../../lib/todayLine';
import type { MealSlot } from '../../lib/mealPlanView';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Surface } from '../ui/Surface';

// Polish step 4: Home's Today line (board "Home"). The day as one list in time order on a rail. Done items shrink to a
// tick, the current item carries its buttons, a missed meal keeps As planned / Something else / Skipped.

const G = AREA_COLORS.nutrition;
const B = AREA_COLORS.workouts;

export interface TodayLineProps {
  items: TodayItem[];
  logging: boolean;
  onAteAsPlanned: (slot: MealSlot) => void;
  onSomethingElse: (slot: MealSlot) => void;
  onSkipped: (slot: MealSlot) => void;
  onStart: () => void;
  onPlan: () => void;
}

function Node({ state, color }: { state: TodayItem['state']; color: string }) {
  if (state === 'done') {
    return (
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={10} color={COLORS.bg} strokeWidth={3.5} />
      </View>
    );
  }
  if (state === 'current') return <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: color, backgroundColor: tint(color, 0.3), boxShadow: `0px 0px 8px ${tint(color, 0.7)}` } as object} />;
  if (state === 'missed') return <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: color }} />;
  return <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)' }} />;
}


/** Premium B6: "Now" only within an hour of the meal's time; earlier it is "Next". */
function mealLead(at: number): string {
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  return at - now > 60 ? 'Next' : 'Now';
}

export function TodayLine({ items, logging, onAteAsPlanned, onSomethingElse, onSkipped, onStart, onPlan }: TodayLineProps) {
  // Closed by default: only what needs you now (the current item, else the first missed one, else the next one). The
  // arrow opens the whole day. Several missed meals plus buttons made this card taller than a screen.
  const [expanded, setExpanded] = useState(false);
  const focus = items.find((i) => i.state === 'current') ?? items.find((i) => i.state === 'missed') ?? items.find((i) => i.state === 'upcoming') ?? items[items.length - 1];
  const all = items;
  items = expanded || !focus ? all : [focus];
  // What is hidden and still to do: a logged meal is not "more in your day".
  const hidden = all.filter((i) => i.state !== 'done' && !items.includes(i)).length;
  const missedHidden = !expanded ? all.filter((i) => i.state === 'missed' && i.id !== focus?.id).length : 0;
  return (
    <View style={{ gap: 4 }}>
    {/* Premium H7: the heading sits outside the card with a Plan link, the time has its own column, nodes follow the item's kind. */}
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
      <Text accessibilityRole="header" style={{ color: COLORS.fg, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, fontFamily: BG[800] }}>Today</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable onPress={onPlan} accessibilityRole="button" accessibilityLabel="Open your plan" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[700] }}>Plan {'›'}</Text>
        </Pressable>
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Show less of today' : 'Show the whole day'}
          hitSlop={4}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
        </Pressable>
      </View>
    </View>
    <Surface padding={16}>
      <View accessibilityRole="list">
        {items.map((it, idx) => {
          const color = it.kind === 'meal' ? G : it.kind === 'session' ? B : AREA_COLORS.sleep;
          const last = idx === items.length - 1;
          const open = it.state === 'current' || it.state === 'missed';
          const dim = it.state === 'done' || (it.state === 'upcoming' && it.kind !== 'sleep');
          return (
            <View key={it.id} style={{ flexDirection: 'row', gap: 10 }} accessibilityLabel={`${it.timeLabel} ${it.title}${it.line ? `, ${it.line}` : ''}${it.state === 'done' ? ', done' : it.state === 'missed' ? ', not done yet' : ''}`}>
              <Text style={{ width: 44, color: COLORS.textMuted, fontSize: 13, lineHeight: 20, paddingTop: 2, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>{it.timeLabel}</Text>
              <View style={{ alignItems: 'center', width: 16 }}>
                <View style={{ marginTop: 3 }}>
                  <Node state={it.state} color={color} />
                </View>
                {!last ? <View style={{ flex: 1, width: 2, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.10)', minHeight: 14 }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: last ? 0 : 16, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={{ color: dim ? COLORS.textMuted : COLORS.fg, fontSize: open ? 17 : 15, flexShrink: 1, fontFamily: bg(open ? '800' : '600') }}>{it.title}</Text>
                </View>
                {it.line ? (
                  <Text
                    style={{ color: it.state === 'done' ? G : it.state === 'current' ? '#C4C4CC' : COLORS.textMuted, fontSize: 15, lineHeight: 20, fontFamily: BG[400] }}
                    numberOfLines={open ? 3 : 1}
                  >
                    {it.state === 'current' && it.kind === 'meal' ? `${mealLead(it.at)} · ${it.line}` : it.line}
                  </Text>
                ) : null}

                {it.kind === 'meal' && it.slot && it.state === 'current' ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {it.hasPlan ? (
                      <View style={{ flex: 1 }}>
                        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" fullWidth disabled={logging} onPress={() => onAteAsPlanned(it.slot!)}>
                          As planned
                        </Button>
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Button variant="secondary" accent={G} size="md" fullWidth onPress={() => onSomethingElse(it.slot!)}>
                        Different
                      </Button>
                    </View>
                  </View>
                ) : null}

                {it.kind === 'meal' && it.slot && it.state === 'missed' ? (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {it.hasPlan ? (
                        <View style={{ flex: 1 }}>
                          <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" fullWidth disabled={logging} onPress={() => onAteAsPlanned(it.slot!)}>
                            As planned
                          </Button>
                        </View>
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <Button variant="secondary" accent={G} size="md" fullWidth onPress={() => onSomethingElse(it.slot!)}>
                          Different
                        </Button>
                      </View>
                    </View>
                    <Button variant="ghost" size="sm" fullWidth disabled={logging} onPress={() => onSkipped(it.slot!)}>
                      I skipped it
                    </Button>
                  </View>
                ) : null}

                {it.kind === 'session' && (it.state === 'current' || it.state === 'missed') ? (
                  <View style={{ flexDirection: 'row', marginTop: 4 }}>
                    <Button variant="primary" size="md" onPress={onStart} icon={<Icon name="play" size={14} color="#fff" />}>
                      Start
                    </Button>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      {!expanded && hidden > 0 ? (
        <Pressable onPress={() => setExpanded(true)} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>
            {missedHidden > 0 ? `${missedHidden} more to answer · ${hidden} in the day` : `${hidden} more in your day`}
          </Text>
          <Icon name="chevron-down" size={18} color={COLORS.textMuted} />
        </Pressable>
      ) : null}
    </Surface>
    </View>
  );
}
