import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet } from './ui/BottomSheet';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
import { Surface } from './ui/Surface';
import { SleepLogModal } from './SleepLogModal';
import { ActivitySheet } from './workouts/ActivityCard';
import { useToast } from './ui/Toast';
import { useAppState } from '../lib/appState';
import { logWater } from '../lib/data';
import { AREA_COLORS, COLORS, FONT, tint, BG, bg } from '../lib/theme';
import { success } from '../lib/haptics';

// Premium F1 (first version): the centre + in the tab bar. One sheet, the four things people log most.
// Meal and sleep open their own screens; water logs 250 ml at once with an Undo message.

interface QuickLogCtx {
  open: () => void;
  /** Opens the activity sheet directly (the Start activity button on the Steps widget). */
  openActivity: () => void;
}
const Ctx = createContext<QuickLogCtx>({ open: () => {}, openActivity: () => {} });
export const useQuickLog = () => useContext(Ctx);

function Action({ icon, color, title, sub, onPress }: { icon: string; color: string; title: string; sub: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} style={{ flex: 1 }}>
      <Surface radius={18} padding={14} grain={0.06} borderColor="rgba(255,255,255,0.08)" shadow={false} style={{ minHeight: 112 }}>
        <View style={{ gap: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(color, 0.16) }}>
            <Icon name={icon} size={22} color={color} />
          </View>
          <View>
            <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{title}</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{sub}</Text>
          </View>
        </View>
      </Surface>
    </PressScale>
  );
}

export function QuickLogProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const { userId } = useAppState();
  const [visible, setVisible] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const openActivity = useCallback(() => setActivityOpen(true), []);
  const value = useMemo(() => ({ open, openActivity }), [open, openActivity]);
  const close = () => setVisible(false);

  const addWater = async () => {
    close();
    if (!userId) return;
    success();
    const ok = await logWater(userId, 250);
    toast.show({ message: ok ? 'Logged 250 ml of water' : 'Could not log water' });
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <BottomSheet visible={visible} onClose={close} maxHeightFraction={0.8}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
          <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800] }}>Quick log</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Action icon="camera" color={AREA_COLORS.nutrition} title="Scan a meal" sub="Photo of your plate" onPress={() => { close(); router.push('/scan'); }} />
            <Action icon="utensils" color={AREA_COLORS.nutrition} title="Add food" sub="Search or describe" onPress={() => { close(); router.push('/meal-log'); }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Action icon="droplets" color={AREA_COLORS.water} title="Water" sub="Add 250 ml" onPress={addWater} />
            <Action icon="moon" color={AREA_COLORS.sleep} title="Sleep" sub="Last night" onPress={() => { close(); setTimeout(() => setSleepOpen(true), 350); }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Action icon="zap" color={AREA_COLORS.streak} title="Activity" sub="Sport, a long walk" onPress={() => { close(); setTimeout(() => setActivityOpen(true), 350); }} />
            <Action icon="scan-line" color={AREA_COLORS.nutrition} title="Barcode" sub="Packaged food" onPress={() => { close(); router.push('/barcode'); }} />
          </View>
        </View>
      </BottomSheet>
      <SleepLogModal visible={sleepOpen} onClose={() => setSleepOpen(false)} />
      <ActivitySheet visible={activityOpen} userId={userId} onClose={() => setActivityOpen(false)} onLogged={(message) => toast.show({ message })} />
    </Ctx.Provider>
  );
}
