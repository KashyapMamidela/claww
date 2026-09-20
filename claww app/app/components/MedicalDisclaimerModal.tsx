import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import { MEDICAL_DISCLAIMER_BODY, MEDICAL_DISCLAIMER_TITLE } from '../lib/medicalDisclaimer';
import { Icon } from './ui/Icon';

export interface MedicalDisclaimerModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * SHIP PHASE 7.4 — the permanently-reachable half of the medical disclaimer
 * requirement (the acknowledgement gate lives in
 * screens/onboarding/reveal.tsx). Read-only: no re-acknowledgement needed
 * here, just the same text the user already agreed to, available any time
 * from Profile.
 */
export function MedicalDisclaimerModal({ visible, onClose }: MedicalDisclaimerModalProps) {
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
                backgroundColor: COLORS.amberDim,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="alert-triangle" size={18} color={COLORS.amber} />
            </View>
            <Text style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{MEDICAL_DISCLAIMER_TITLE}</Text>
          </View>

          <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 19, fontFamily: FONT }}>{MEDICAL_DISCLAIMER_BODY}</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={{
              height: 48,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.06)',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 4,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
