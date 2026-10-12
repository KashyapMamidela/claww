import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AREA_COLORS, COLORS, FONT } from '../lib/theme';
import { getDaySessionLogs, type PlanDay, type WorkoutDayEvent } from '../lib/data';
import { summarizeSession, type LoggedSetRow } from '../lib/workoutDayState';
import { getNextTimeDecisions, type NextTimeDecision } from '../lib/adaptiveData';
import { commandPill } from '../lib/sessionPrescription';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import { SessionDetailModal } from './SessionDetailModal';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function formatVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}K` : String(Math.round(kg));
}

export interface CompletedDayCardProps {
  userId: string;
  day: PlanDay;
  event: WorkoutDayEvent;
}

/** Shown instead of Begin Workout when the selected day was completed. */
export function CompletedDayCard({ userId, day, event }: CompletedDayCardProps) {
  const [rows, setRows] = useState<LoggedSetRow[] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [decisions, setDecisions] = useState<NextTimeDecision[]>([]);

  // V2 PHASE 7.3: what the engine decided for next time, saved when this session ended.
  useEffect(() => {
    let cancelled = false;
    const from = new Date(event.createdAt);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    getNextTimeDecisions(userId, from.toISOString(), to.toISOString(), day.exercises.map((ex) => ex.name)).then((d) => {
      if (!cancelled) setDecisions(d);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, event.createdAt, day]);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    getDaySessionLogs(userId, event.createdAt, day.exercises.map((ex) => ex.name)).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, event.createdAt, day]);

  const summary = rows ? summarizeSession(rows) : null;
  const plannedSets = day.exercises.reduce((s, ex) => s + ex.sets, 0);

  return (
    <View
      style={{
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: COLORS.greenBorder,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="check-circle-2" size={18} color={COLORS.green} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.green, fontSize: 13.5, fontWeight: '800', fontFamily: FONT }}>Completed</Text>
          <Text style={{ color: '#71717A', fontSize: 11, marginTop: 1, fontFamily: FONT }}>{formatWhen(event.createdAt)}</Text>
        </View>
      </View>

      {!summary ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={44} borderRadius={12} />
          <Skeleton height={60} borderRadius={12} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'SETS', value: `${summary.setsDone}`, sub: `of ${plannedSets} planned` },
              { label: 'VOLUME', value: formatVolume(summary.totalVolumeKg), sub: 'kg' },
              {
                label: 'DURATION',
                value: summary.durationMinutes !== null ? `${summary.durationMinutes}` : '—',
                sub: summary.durationMinutes !== null ? 'min, first to last set' : 'not enough sets',
              },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 }}>
                <Text style={{ color: '#71717A', fontSize: 9, fontWeight: '700', letterSpacing: 0.6, fontFamily: FONT }}>{s.label}</Text>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900', marginTop: 2, fontFamily: FONT }}>{s.value}</Text>
                <Text style={{ color: '#52525B', fontSize: 9.5, marginTop: 1, fontFamily: FONT }}>{s.sub}</Text>
              </View>
            ))}
          </View>

          {summary.exercises.length === 0 ? (
            <Text style={{ color: '#71717A', fontSize: 12, lineHeight: 18, fontFamily: FONT }}>
              No sets were found for this day's exercises on that date.
            </Text>
          ) : (
            <View style={{ gap: 6 }}>
              {summary.exercises.map((ex) => (
                <View key={ex.name} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '700', flex: 1, fontFamily: FONT }} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  <Text style={{ color: '#A1A1AA', fontSize: 12, fontFamily: FONT }} numberOfLines={1}>
                    {ex.sets.map((s) => (s.weight > 0 ? `${s.reps}×${s.weight}` : `${s.reps}`)).join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {decisions.length > 0 ? (
            <View style={{ gap: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(168,85,247,0.08)' }}>
              <Text style={{ color: AREA_COLORS.engine, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, fontFamily: FONT }}>WHAT CHANGED FOR NEXT TIME</Text>
              {decisions.map((d) => (
                <View key={d.exerciseName} style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: 12.5, fontWeight: '700', fontFamily: FONT }}>{d.exerciseName}</Text>
                    <Text style={{ color: AREA_COLORS.engine, fontSize: 11, fontWeight: '800', fontFamily: FONT }}>{commandPill(d.commands).label.toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: '#A1A1AA', fontSize: 11.5, lineHeight: 16, fontFamily: FONT }}>{d.reason}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Button variant="ghost" fullWidth onPress={() => setDetailOpen(true)} icon={<Icon name="layout-grid" size={14} color="#A1A1AA" />}>
            View full session
          </Button>
        </>
      )}

      <SessionDetailModal visible={detailOpen} title={`${day.day} · ${day.focus}`} rows={rows ?? []} onClose={() => setDetailOpen(false)} />
    </View>
  );
}

export interface SkippedDayCardProps {
  day: PlanDay;
  event: WorkoutDayEvent;
  onDoToday: () => void;
  onKeepToday: () => void;
}

/** Shown instead of Begin Workout when the selected day was skipped. */
export function SkippedDayCard({ day, event, onDoToday, onKeepToday }: SkippedDayCardProps) {
  return (
    <View
      style={{
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: COLORS.dangerBorder,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="x" size={18} color={COLORS.danger} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.danger, fontSize: 13.5, fontWeight: '800', fontFamily: FONT }}>Skipped</Text>
          <Text style={{ color: '#71717A', fontSize: 11, marginTop: 1, fontFamily: FONT }}>{formatWhen(event.createdAt)}</Text>
        </View>
      </View>
      <Text style={{ color: '#A1A1AA', fontSize: 12.5, lineHeight: 18, fontFamily: FONT }}>
        {day.focus} · {day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}
      </Text>
      <View style={{ gap: 8 }}>
        <Button variant="primary" accent={COLORS.blue} accentDeep={COLORS.blueDeep} fullWidth onPress={onDoToday} icon={<Icon name="play" size={14} color="#fff" />}>
          Do it today instead
        </Button>
        <Button variant="ghost" fullWidth onPress={onKeepToday}>
          Keep today's plan
        </Button>
      </View>
    </View>
  );
}

export interface MissedDayCardProps {
  day: PlanDay;
  /** The date this plan day was scheduled for (this week). */
  date: Date;
  onDoToday: () => void;
  onKeepToday: () => void;
}

/** Shown instead of Begin Workout when a planned weekday passed with nothing logged. It never pretends the past day can still be begun. */
export function MissedDayCard({ day, date, onDoToday, onKeepToday }: MissedDayCardProps) {
  return (
    <View
      style={{
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: COLORS.dangerBorder,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="x" size={18} color={COLORS.danger} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.danger, fontSize: 13.5, fontWeight: '800', fontFamily: FONT }}>Missed</Text>
          <Text style={{ color: '#71717A', fontSize: 11, marginTop: 1, fontFamily: FONT }}>
            {date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>
      <Text style={{ color: '#A1A1AA', fontSize: 12.5, lineHeight: 18, fontFamily: FONT }}>
        {day.focus} · {day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}. Nothing was logged for this day.
      </Text>
      <View style={{ gap: 8 }}>
        <Button variant="primary" accent={COLORS.blue} accentDeep={COLORS.blueDeep} fullWidth onPress={onDoToday} icon={<Icon name="play" size={14} color="#fff" />}>
          Do {day.focus} today instead
        </Button>
        <Button variant="ghost" fullWidth onPress={onKeepToday}>
          Keep today's plan
        </Button>
      </View>
      <Text style={{ color: '#52525B', fontSize: 11, fontFamily: FONT }}>Either way, {day.day} stays marked as missed.</Text>
    </View>
  );
}
