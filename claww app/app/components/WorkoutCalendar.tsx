import React, { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { getWorkoutDayEventsInRange, type WorkoutDayEvent } from '../lib/data';
import { Icon } from './ui/Icon';

const A = COLORS.blue;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

interface DayCellProps {
  date: Date;
  event: WorkoutDayEvent | undefined;
  isToday: boolean;
  size: number;
}

function DayCell({ date, event, isToday, size }: DayCellProps) {
  const completed = event?.status === 'completed';
  const skipped = event?.status === 'skipped';
  const bg = completed ? 'rgba(34,197,94,0.16)' : skipped ? 'rgba(245,158,11,0.14)' : 'rgba(255,255,255,0.035)';
  const border = completed ? 'rgba(34,197,94,0.4)' : skipped ? 'rgba(245,158,11,0.35)' : isToday ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3.2,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {completed ? (
        <Icon name="check" size={size * 0.4} color={COLORS.green} strokeWidth={3} />
      ) : skipped ? (
        <Icon name="x" size={size * 0.36} color={COLORS.amber} strokeWidth={2.5} />
      ) : (
        <Text style={{ color: isToday ? A : '#52525B', fontSize: size * 0.34, fontWeight: isToday ? '800' : '600', fontFamily: FONT }}>
          {date.getDate()}
        </Text>
      )}
    </View>
  );
}

export function WorkoutCalendar() {
  const { userId } = useAppState();
  const [events, setEvents] = useState<WorkoutDayEvent[]>([]);
  const [showMonth, setShowMonth] = useState(false);

  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(today), [today]);
  const monthStart = useMemo(() => startOfMonth(today), [today]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      const rangeStart = toDateKey(monthStart);
      const rangeEnd = toDateKey(today);
      getWorkoutDayEventsInRange(userId, rangeStart, rangeEnd).then((rows) => {
        if (!cancelled) setEvents(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [userId, monthStart, today])
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, WorkoutDayEvent>();
    for (const ev of events) {
      // Last event of the day wins if there were multiple (e.g. skip then complete later).
      map.set(ev.eventDate, ev);
    }
    return map;
  }, [events]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const monthDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const leadingBlanks = monthStart.getDay();
    for (let i = 0; i < leadingBlanks; i++) days.push(null);
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
    return days;
  }, [monthStart]);

  const monthLabel = monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const completedThisMonth = events.filter((e) => e.status === 'completed').length;
  const skippedThisMonth = events.filter((e) => e.status === 'skipped').length;

  return (
    <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>This Week</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setShowMonth((s) => !s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: A, fontSize: 11.5, fontWeight: '700', fontFamily: FONT }}>{showMonth ? 'Hide month' : 'View month'}</Text>
          <Icon name={showMonth ? 'chevron-up' : 'chevron-right'} size={12} color={A} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {weekDays.map((d, i) => (
          <Animated.View
            key={toDateKey(d)}
            entering={FadeInDown.delay(i * 40).springify().damping(16)}
            style={{ alignItems: 'center', gap: 4 }}
          >
            <Text style={{ color: '#52525B', fontSize: 9.5, fontWeight: '700', fontFamily: FONT }}>{DAY_LABELS[d.getDay()]}</Text>
            <DayCell date={d} event={eventsByDate.get(toDateKey(d))} isToday={toDateKey(d) === toDateKey(today)} size={38} />
          </Animated.View>
        ))}
      </View>

      {showMonth && (
        <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={{ color: '#A1A1AA', fontSize: 11.5, fontWeight: '700', marginBottom: 10, fontFamily: FONT }}>{monthLabel}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            {DAY_LABELS.map((l, i) => (
              <Text key={i} style={{ width: 30, textAlign: 'center', color: '#52525B', fontSize: 9, fontWeight: '700', fontFamily: FONT }}>
                {l}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {monthDays.map((d, i) =>
              d ? (
                <View key={i} style={{ width: 30, alignItems: 'center' }}>
                  <DayCell date={d} event={eventsByDate.get(toDateKey(d))} isToday={toDateKey(d) === toDateKey(today)} size={28} />
                </View>
              ) : (
                <View key={i} style={{ width: 30, height: 28 }} />
              )
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green }} />
              <Text style={{ color: '#71717A', fontSize: 10.5, fontFamily: FONT }}>{completedThisMonth} completed</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.amber }} />
              <Text style={{ color: '#71717A', fontSize: 10.5, fontFamily: FONT }}>{skippedThisMonth} skipped</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
