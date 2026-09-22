import React, { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import { Icon } from './ui/Icon';
import { TimeWheelPicker, dateToTimeValue, timeValueToDate, timeValueToLabel, type TimeValue } from './ui/TimeWheelPicker';
import { getLatestSleepLog } from '../lib/data';
import { useAppState } from '../lib/appState';

export interface SleepLogModalProps {
  visible: boolean;
  onClose: () => void;
}

const SLEEP = COLORS.indigo;

const DEFAULT_BEDTIME: TimeValue = { hour: 10, minute: 30, period: 'PM' };
const DEFAULT_WAKE: TimeValue = { hour: 6, minute: 0, period: 'AM' };

/** Hours between a bedtime and a wake time, assuming the wake time is the
 * next calendar occurrence at/after the bedtime (handles the normal
 * overnight case; a same-day nap-length entry isn't this card's job). */
function hoursBetween(bedtime: TimeValue, wake: TimeValue): number {
  const base = new Date(2000, 0, 1);
  const bed = timeValueToDate(bedtime, base);
  let wakeDate = timeValueToDate(wake, base);
  if (wakeDate.getTime() <= bed.getTime()) {
    wakeDate = new Date(wakeDate.getTime() + 24 * 60 * 60 * 1000);
  }
  return (wakeDate.getTime() - bed.getTime()) / (1000 * 60 * 60);
}

function quality(hours: number): { label: string; color: string } {
  if (hours < 5) return { label: 'Poor', color: COLORS.danger };
  if (hours < 6.5) return { label: 'Fair', color: COLORS.amber };
  if (hours < 7.5) return { label: 'Good', color: COLORS.green };
  if (hours <= 9) return { label: 'Optimal', color: SLEEP };
  return { label: 'Excess', color: COLORS.fgGray };
}

type Step = 'bedtime' | 'wake';

/**
 * Replaces the old hours-dial entry: bedtime and wake-up time are what the
 * user actually knows off the top of their head, not a duration they have
 * to mentally compute — so this asks for the two times directly (a
 * rotating scroll-wheel, like a native alarm picker) and derives hours
 * from them. Asked one at a time (bedtime, then wake-up) rather than two
 * pickers side by side — two 3-column wheel groups side by side doesn't
 * fit a phone width without cramping both into illegibility.
 *
 * Defaults pre-fill from the user's own last real entry (getLatestSleepLog,
 * unscoped by date — the most recent bedtime/wake time they ever logged),
 * not a hardcoded "10:30 PM" — the first-ever log has no history yet, so it
 * falls back to a generic default just for that one time; every log after
 * that inherits from the previous one, which is what "default... set the
 * first time, then remembered" means in practice without needing a
 * separate profile field to maintain in sync.
 */
export function SleepLogModal({ visible, onClose }: SleepLogModalProps) {
  const { userId, logSleep } = useAppState();
  const [step, setStep] = useState<Step>('bedtime');
  const [bedtime, setBedtime] = useState<TimeValue>(DEFAULT_BEDTIME);
  const [wake, setWake] = useState<TimeValue>(DEFAULT_WAKE);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;
    setReady(false);
    setStep('bedtime');
    getLatestSleepLog(userId).then((log) => {
      if (cancelled) return;
      if (log?.bedtime) setBedtime(dateToTimeValue(new Date(log.bedtime)));
      if (log?.wake_time) setWake(dateToTimeValue(new Date(log.wake_time)));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  const hours = hoursBetween(bedtime, wake);
  const q = quality(hours);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date();
    const wakeDate = timeValueToDate(wake, now);
    // Bedtime is "yesterday" relative to wake whenever it's a later clock
    // time than wake (the normal overnight case, e.g. 10:30 PM -> 6:00 AM).
    let bedtimeDate = timeValueToDate(bedtime, now);
    if (bedtimeDate.getTime() >= wakeDate.getTime()) {
      bedtimeDate = new Date(bedtimeDate.getTime() - 24 * 60 * 60 * 1000);
    }
    await logSleep(hours, bedtimeDate, wakeDate);
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 340,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 20,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {step === 'wake' && (
              <TouchableOpacity onPress={() => setStep('bedtime')} hitSlop={10}>
                <Icon name="chevron-left" size={20} color={COLORS.fgGrayDim} />
              </TouchableOpacity>
            )}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: COLORS.indigoDim,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="moon" size={17} color={SLEEP} />
            </View>
            <Text style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>
              {step === 'bedtime' ? 'When did you go to bed?' : 'When did you wake up?'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Icon name="x" size={18} color={COLORS.fgGrayDim} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <View style={{ width: 22, height: 4, borderRadius: 2, backgroundColor: step === 'bedtime' ? SLEEP : 'rgba(255,255,255,0.14)' }} />
            <View style={{ width: 22, height: 4, borderRadius: 2, backgroundColor: step === 'wake' ? SLEEP : 'rgba(255,255,255,0.14)' }} />
          </View>

          {ready ? (
            <>
              <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                {step === 'bedtime' ? (
                  <TimeWheelPicker key="bedtime" initialValue={bedtime} onChange={setBedtime} />
                ) : (
                  <TimeWheelPicker key="wake" initialValue={wake} onChange={setWake} />
                )}
              </View>

              {step === 'wake' && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', fontFamily: FONT }}>{hours.toFixed(1)}h</Text>
                  <Text style={{ color: COLORS.fgGrayDim, fontSize: 12, fontFamily: FONT }}>
                    {timeValueToLabel(bedtime)} → {timeValueToLabel(wake)}
                  </Text>
                  <Text style={{ color: q.color, fontSize: 12, fontWeight: '700', fontFamily: FONT }}>{q.label}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.fgGrayDim, fontSize: 12, fontFamily: FONT }}>Loading…</Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!ready || saving}
            onPress={step === 'bedtime' ? () => setStep('wake') : handleSave}
            style={{
              height: 48,
              borderRadius: 13,
              backgroundColor: SLEEP,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !ready || saving ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: FONT }}>
              {step === 'bedtime' ? 'Next' : saving ? 'Saving…' : 'Log Sleep'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
