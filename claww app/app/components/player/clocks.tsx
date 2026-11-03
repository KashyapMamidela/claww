import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { useNow } from '../../lib/useNow';
import { elapsedSeconds, restRemainingSeconds, type ClockState } from '../../lib/sessionClock';
import { useRenderCount } from '../../lib/perf';

export function formatClock(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function formatRest(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

/** Session clock. The only thing that re-renders once a second while training. */
export function ElapsedClock({ clock, style, prefix = '' }: { clock: ClockState; style?: TextStyle; prefix?: string }) {
  useRenderCount('ElapsedClock');
  const now = useNow(1000, clock.pausedAt === null);
  return <Text style={style}>{`${prefix}${formatClock(elapsedSeconds(clock, now))}`}</Text>;
}

/** Rest countdown text. Ticks only while resting. */
export function useRestRemaining(clock: ClockState | null): number {
  const active = !!clock && clock.restEndsAt !== null && clock.pausedAt === null;
  const now = useNow(250, active);
  return clock ? restRemainingSeconds(clock, now) : 0;
}

export function RestCountdown({ clock, style, prefix = '' }: { clock: ClockState; style?: TextStyle; prefix?: string }) {
  useRenderCount('RestCountdown');
  const remaining = useRestRemaining(clock);
  return <Text style={style}>{`${prefix}${formatClock(remaining)}`}</Text>;
}
