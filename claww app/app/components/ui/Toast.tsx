import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, TAB_BAR_HEIGHT } from '../../lib/theme';
import { warning } from '../../lib/haptics';

// Premium D4: "Logged breakfast · Undo", for 5 seconds, instead of a confirm dialog. One toast at a time, floating
// just above the tab bar. Show with useToast().show({ message, actionLabel, onAction }).

export interface ToastInput {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Milliseconds, default 5000. */
  duration?: number;
}

interface ToastCtx {
  show: (t: ToastInput) => void;
}
const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastInput | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (t: ToastInput) => {
      if (timer.current) clearTimeout(timer.current);
      if (t.actionLabel) warning();
      setToast(t);
      timer.current = setTimeout(() => setToast(null), t.duration ?? 5000);
    },
    []
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT + 12, zIndex: 50 }}>
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(160)}
            accessibilityLiveRegion="polite"
            style={{
              minHeight: 48,
              borderRadius: 16,
              paddingLeft: 16,
              paddingRight: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#1F1F23',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <Text style={{ flex: 1, color: COLORS.fg, fontSize: 15, fontWeight: '600', fontFamily: FONT }} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.onAction?.();
                  hide();
                }}
                style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}
              >
                <Text style={{ color: '#93C5FD', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{toast.actionLabel}</Text>
              </Pressable>
            ) : (
              <View style={{ width: 10 }} />
            )}
          </Animated.View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}
