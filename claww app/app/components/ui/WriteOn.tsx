import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Premium X1: a handwritten line that writes itself in, left to right, the first time it is seen. After that it just
// shows. Keyed by the text, so a new line writes in again. Reduce motion shows it at once.

const KEY = 'claww.penSeen.v1';
let seen: Set<string> | null = null;

async function loadSeen(): Promise<Set<string>> {
  if (seen) return seen;
  try {
    seen = new Set(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]'));
  } catch {
    seen = new Set();
  }
  return seen;
}

export function WriteOn({ id, children, duration = 900 }: { id: string; children: React.ReactNode; duration?: number }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSeen().then((set) => {
      if (cancelled) return;
      if (!set.has(id) && !reduced) {
        progress.value = 0;
        set.add(id);
        AsyncStorage.setItem(KEY, JSON.stringify([...set].slice(-60))).catch(() => {});
      } else {
        progress.value = 1;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id, reduced, progress]);

  useEffect(() => {
    if (ready && width > 0 && progress.value === 0) progress.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
  }, [ready, width, duration, progress]);

  const mask = useAnimatedStyle(() => ({ width: width * progress.value }));

  return (
    <View style={{ alignSelf: 'flex-start' }}>
      {/* The text is measured at full width, then revealed from the left by a clipping box. */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: 1200, opacity: 0 }} pointerEvents="none">
        <View style={{ alignSelf: 'flex-start' }} onLayout={(e) => setWidth(Math.ceil(e.nativeEvent.layout.width) + 2)}>
          {children}
        </View>
      </View>
      <Animated.View style={[{ overflow: 'hidden' }, ready && width > 0 ? mask : { width: undefined }]}>
        <View style={{ width: width > 0 ? width : undefined }}>{children}</View>
      </Animated.View>
    </View>
  );
}
