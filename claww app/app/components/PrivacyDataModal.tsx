import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import { Icon } from './ui/Icon';

export interface PrivacyDataModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  onDelete: () => void;
}

/**
 * SHIP PHASE 8.1 — the real destination for the "Privacy & Data" row, per
 * the roadmap: a summary of what's collected plus shortcuts to the export
 * (7.5) and delete (7.1) flows that already exist as their own Profile rows.
 * Deliberately doesn't duplicate their implementation — onExport/onDelete
 * just close this modal and trigger the caller's existing handlers, so
 * there's one real export/delete implementation, not two.
 */
export function PrivacyDataModal({ visible, onClose, onExport, onDelete }: PrivacyDataModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 20,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="shield" size={18} color="#A1A1AA" />
            </View>
            <Text style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>Privacy & Data</Text>
          </View>

          <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 19, fontFamily: FONT }}>
            CLAWW stores your profile, workout and meal logs, and progress data to build and adapt
            your plans. Meal photos and injury notes are sent to our AI provider only to generate
            estimates — never sold, never shared beyond what's needed to run the app.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              onClose();
              onExport();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Icon name="download" size={16} color="#A1A1AA" />
            <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Download My Data</Text>
            <Icon name="chevron-right" size={15} color="#71717A" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              onClose();
              onDelete();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: COLORS.dangerDim,
              borderWidth: 1,
              borderColor: COLORS.dangerBorder,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Icon name="trash-2" size={16} color={COLORS.danger} />
            <Text style={{ flex: 1, color: COLORS.danger, fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Delete Account</Text>
            <Icon name="chevron-right" size={15} color={COLORS.danger} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={{
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
