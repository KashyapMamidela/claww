import React, { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { AREA_COLORS, COLORS, FONT, tint } from '../lib/theme';
import { deleteWaterLog, getTodaysWaterLogs, logWater, type WaterLogRow } from '../lib/data';
import { refreshReminders } from '../lib/reminderSync';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
import { Surface } from './ui/Surface';
import { BottomSheet } from './ui/BottomSheet';
import { WaterWidget } from './WaterWidget';

const C = AREA_COLORS.water;
const TARGET_ML = 2000;
const GLASS_ML = 250;
const SEGMENTS = TARGET_ML / GLASS_ML; // 8

function litres(ml: number): string {
  const l = ml / 1000;
  const text = ml % 1000 === 0 ? String(l) : l.toFixed(2).replace(/0$/, '');
  return `${text} L`;
}

/**
 * V2 PHASE 4.3 — Home's water as one 48 px row: litres against the target,
 * one segment per 250 ml glass, and + to add a glass. Long-press + for 500
 * ml, 1 L or a custom amount. Tapping the row opens today's entries (with
 * undo) and the full bottle with presets.
 */
export function WaterRow({ userId }: { userId: string | null }) {
  const [entries, setEntries] = useState<WaterLogRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [custom, setCustom] = useState('');

  const reload = useCallback(() => {
    if (!userId) return;
    getTodaysWaterLogs(userId).then(setEntries);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const total = entries.reduce((s, e) => s + e.ml, 0);
  const filled = Math.min(SEGMENTS, Math.floor(total / GLASS_ML));

  const add = async (ml: number) => {
    if (!userId || ml <= 0) return;
    Haptics.selectionAsync().catch(() => {});
    const optimistic: WaterLogRow = { id: `pending-${Date.now()}`, ml, logged_at: new Date().toISOString() };
    setEntries((prev) => [optimistic, ...prev]);
    const ok = await logWater(userId, ml);
    if (ok) refreshReminders(userId).catch(() => {});
    reload();
  };

  const undo = async (entry: WaterLogRow) => {
    if (!userId || entry.id.startsWith('pending-')) return;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    await deleteWaterLog(entry.id);
    refreshReminders(userId).catch(() => {});
    reload();
  };

  return (
    <>
      <PressScale onPress={() => setSheetOpen(true)} accessibilityRole="button" accessibilityLabel={`Water: ${litres(total)} of ${litres(TARGET_ML)}. Open today's water log.`}>
        <Surface radius={18} padding={0} grain={0.06} style={{ height: 64 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingRight: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(C, 0.14), borderWidth: 1, borderColor: tint(C, 0.3) }}>
            <Icon name="droplets" size={19} color={C} />
          </View>
          <View style={{ flex: 1, gap: 7 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], fontFamily: FONT }}>
              {litres(total)}
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600' }}> of {litres(TARGET_ML)}</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {Array.from({ length: SEGMENTS }, (_, i) => (
                <View key={i} style={[{ flex: 1, height: 7, borderRadius: 4, backgroundColor: i < filled ? C : tint(C, 0.15) }, i < filled ? ({ boxShadow: `0px 0px 6px ${tint(C, 0.8)}` } as object) : null]} />
              ))}
            </View>
          </View>
          <PressScale
            onPress={() => add(GLASS_ML)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setMenuOpen(true);
            }}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityLabel="Add a 250 millilitre glass. Long press for more amounts."
            hitSlop={4}
          >
            <LinearGradient colors={['#0369A1', '#38BDF8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 8px 18px -8px ${tint(C, 0.9)}` } as object}>
              <Icon name="plus" size={20} color="#fff" strokeWidth={2.6} />
            </LinearGradient>
          </PressScale>
        </View>
        </Surface>
      </PressScale>

      {menuOpen ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setMenuOpen(false)} statusBarTranslucent>
          <Pressable onPress={() => setMenuOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 28 }}>
            <Pressable onPress={() => {}} style={{ backgroundColor: COLORS.card, borderRadius: 18, padding: 16, gap: 10 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>Add water</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[500, 1000].map((ml) => (
                  <PressScale
                    key={ml}
                    style={{ flex: 1 }}
                    onPress={() => {
                      setMenuOpen(false);
                      add(ml);
                    }}
                  >
                    <View style={{ height: 44, borderRadius: 12, backgroundColor: tint(C, 0.16), alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: C, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{ml === 1000 ? '1 L' : `${ml} ml`}</Text>
                    </View>
                  </PressScale>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  placeholder="Custom ml"
                  placeholderTextColor="#52525B"
                  keyboardType="number-pad"
                  style={{ flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontFamily: FONT }}
                />
                <PressScale
                  onPress={() => {
                    const ml = Math.round(Number(custom));
                    setCustom('');
                    setMenuOpen(false);
                    if (ml > 0 && ml <= 5000) add(ml);
                  }}
                >
                  <View style={{ height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#050505', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>Add</Text>
                  </View>
                </PressScale>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      <BottomSheet
        visible={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          reload();
        }}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }}>
          <Text style={{ color: C, fontSize: 13, fontWeight: '800', letterSpacing: 0.8, fontFamily: FONT }}>WATER TODAY</Text>
          <WaterWidget onAdded={reload} />
          <View style={{ gap: 6 }}>
            {entries.length === 0 ? (
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>Nothing logged yet today.</Text>
            ) : (
              entries.map((e) => (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <Icon name="droplets" size={14} color={C} />
                  <Text style={{ flex: 1, color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONT }}>{e.ml} ml</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>
                    {new Date(e.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  <PressScale onPress={() => undo(e)} accessibilityRole="button" accessibilityLabel={`Undo ${e.ml} millilitres`} hitSlop={6}>
                    <Text style={{ color: '#A1A1AA', fontSize: 13, fontWeight: '700', paddingHorizontal: 6, fontFamily: FONT }}>Undo</Text>
                  </PressScale>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </BottomSheet>
    </>
  );
}
