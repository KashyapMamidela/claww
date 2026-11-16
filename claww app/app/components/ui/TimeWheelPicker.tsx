import React, { useEffect, useRef } from 'react';
import { Animated, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from 'react-native';
import { COLORS, FONT, BG, bg } from '../../lib/theme';

export const ITEM_HEIGHT = 38;
const VISIBLE_ROWS = 5; // odd — the middle row is the selected value
export const PAD = Math.floor(VISIBLE_ROWS / 2) * ITEM_HEIGHT;

export interface TimeValue {
  hour: number; // 1-12
  minute: number; // 0-55, 5-minute steps
  period: 'AM' | 'PM';
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

interface WheelColumnProps {
  items: string[];
  initialIndex: number;
  onChange: (index: number) => void;
  width?: number;
}

// Uncontrolled by design: scroll position is native-driven and only ever
// set once, from `initialIndex`, at mount. A controlled version (re-syncing
// scroll offset from a prop on every change) fights the user's own gesture
// mid-scroll and is a well-known source of jank in wheel pickers — the
// parent instead waits until it has a real initial value before mounting
// this (see SleepLogModal's `ready` gate).
//
// The "rotating wheel" look (not just a flat scrolling list) comes from
// tying each row's rotateX/scale/opacity to live scroll position via
// Animated — the same technique native wheel-picker libraries use to fake
// a cylinder out of a plain vertical list. The interaction underneath is
// still an ordinary scroll/snap, which is the only genuinely reliable
// touch gesture for this across iOS/Android/web; only the visual sells
// "rotating."
export function WheelColumn({ items, initialIndex, onChange, width = 56 }: WheelColumnProps) {
  const scrollY = useRef(new Animated.Value(initialIndex * ITEM_HEIGHT)).current;
  const scrollRef = useRef<ScrollView>(null);
  const lastIndex = useRef(initialIndex);

  // `contentOffset` is only a hint some ScrollView implementations honor at
  // mount — confirmed unreliable on react-native-web (every column silently
  // opened at index 0 regardless of initialIndex). An imperative scrollTo
  // after mount is the one approach that's actually reliable everywhere.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      onChange(index);
    }
  };

  return (
    <View style={{ height: ITEM_HEIGHT * VISIBLE_ROWS, width }}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PAD }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: () => {},
        })}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        // Web fires no momentum event on a plain wheel/trackpad scroll —
        // this covers that case too, at the cost of firing a bit more often.
        onScrollEndDrag={handleMomentumEnd}
      >
        {items.map((item, i) => {
          const center = i * ITEM_HEIGHT;
          const inputRange = [center - 2 * ITEM_HEIGHT, center - ITEM_HEIGHT, center, center + ITEM_HEIGHT, center + 2 * ITEM_HEIGHT];
          const rotateX = scrollY.interpolate({
            inputRange,
            outputRange: ['58deg', '30deg', '0deg', '-30deg', '-58deg'],
            extrapolate: 'clamp',
          });
          const scale = scrollY.interpolate({ inputRange, outputRange: [0.62, 0.84, 1, 0.84, 0.62], extrapolate: 'clamp' });
          const opacity = scrollY.interpolate({ inputRange, outputRange: [0.2, 0.5, 1, 0.5, 0.2], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={item}
              style={{
                height: ITEM_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                opacity,
                transform: [{ perspective: 500 }, { rotateX }, { scale }],
              }}
            >
              <Text style={{ color: '#fff', fontSize: 20, fontFamily: BG[700] }}>{item}</Text>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

interface TimeWheelPickerProps {
  initialValue: TimeValue;
  onChange: (value: TimeValue) => void;
}

/** Alarm-clock-style scroll picker: Hour / Minute (5-min steps) / AM-PM. */
export function TimeWheelPicker({ initialValue, onChange }: TimeWheelPickerProps) {
  // The three wheels are uncontrolled, so the picker keeps the running value itself. Each change must be written
  // back here: before, every wheel spread the *starting* value, so changing the hour and then AM/PM kept only the
  // last change (12:30 AM came out as 11:30 AM).
  const value = useRef({ ...initialValue }).current;
  const change = (patch: Partial<TimeValue>) => {
    Object.assign(value, patch);
    onChange({ ...value });
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <WheelColumn items={HOURS} initialIndex={value.hour - 1} onChange={(i) => change({ hour: i + 1 })} />
        <Text style={{ color: '#fff', fontSize: 17, fontFamily: BG[800], marginHorizontal: 2 }}>:</Text>
        <WheelColumn items={MINUTES} initialIndex={Math.round(value.minute / 5)} onChange={(i) => change({ minute: i * 5 })} />
        <View style={{ width: 14 }} />
        <WheelColumn
          items={PERIODS}
          initialIndex={value.period === 'AM' ? 0 : 1}
          onChange={(i) => change({ period: i === 0 ? 'AM' : 'PM' })}
          width={46}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: PAD,
          height: ITEM_HEIGHT,
          left: 0,
          right: 0,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: 'rgba(255,255,255,0.16)',
        }}
      />
    </View>
  );
}

export function timeValueToLabel(v: TimeValue): string {
  return `${v.hour}:${String(v.minute).padStart(2, '0')} ${v.period}`;
}

/** Builds a real Date for `timeValue` landing on `referenceDate`'s calendar day. */
export function timeValueToDate(v: TimeValue, referenceDate: Date): Date {
  const hour24 = v.period === 'AM' ? (v.hour === 12 ? 0 : v.hour) : v.hour === 12 ? 12 : v.hour + 12;
  const d = new Date(referenceDate);
  d.setHours(hour24, v.minute, 0, 0);
  return d;
}

export function dateToTimeValue(d: Date): TimeValue {
  // Round the whole time to the nearest 5-minute step this picker supports, so 6:58 becomes 7:00, not 6:00.
  const total = Math.round((d.getHours() * 60 + d.getMinutes()) / 5) * 5;
  const h24 = Math.floor(total / 60) % 24;
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const hour = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour, minute: total % 60, period };
}
