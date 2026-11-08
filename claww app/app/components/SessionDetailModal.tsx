import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT, BG, bg } from '../lib/theme';
import type { LoggedSetRow } from '../lib/workoutDayState';

export interface SessionDetailModalProps {
  visible: boolean;
  title: string;
  rows: LoggedSetRow[];
  onClose: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Every set logged in one completed session, in order, with what was
 * planned next to what was actually done. */
export function SessionDetailModal({ visible, title, rows, onClose }: SessionDetailModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            maxHeight: '85%',
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 20,
            gap: 14,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontFamily: BG[800] }}>{title}</Text>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
            {rows.length === 0 ? (
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>No sets were logged for this session.</Text>
            ) : (
              rows.map((r, i) => {
                const reps = r.reps_achieved ?? r.reps_prescribed ?? 0;
                const weight = r.weight_achieved ?? r.weight_prescribed ?? 0;
                const plannedDiffers =
                  r.reps_prescribed !== null &&
                  (r.reps_prescribed !== reps || (r.weight_prescribed ?? 0) !== weight);
                return (
                  <View
                    key={`${r.completed_at}-${i}`}
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontFamily: BG[700], flex: 1 }} numberOfLines={1}>
                        {r.exercise_name}
                      </Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: BG[400] }}>{formatTime(r.completed_at)}</Text>
                    </View>
                    <Text style={{ color: '#A1A1AA', fontSize: 13, marginTop: 3, fontFamily: BG[400] }}>
                      {r.sets !== null ? `Set ${r.sets} · ` : ''}
                      {reps} reps{weight > 0 ? ` × ${weight} kg` : ''}
                      {plannedDiffers ? (
                        <Text style={{ color: COLORS.textFaint }}>
                          {`  (planned ${r.reps_prescribed}${(r.weight_prescribed ?? 0) > 0 ? ` × ${r.weight_prescribed} kg` : ''})`}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={{ height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
