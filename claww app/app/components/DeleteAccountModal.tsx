import React, { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import { deleteAccount } from '../lib/auth';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';

const CONFIRM_WORD = 'DELETE';

export interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The real confirmation gate for account deletion (SHIP PHASE 7.1) — a
 * single tap must never be enough for an action this irreversible. Requires
 * typing "DELETE" verbatim before the button even enables, on top of the
 * Edge Function's own independent `confirm: 'DELETE'` body check (see
 * supabase/functions/delete-account). Reusable so 8.2's Settings / Privacy
 * & Data screen can open the same modal instead of duplicating this flow.
 */
export function DeleteAccountModal({ visible, onClose }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD && !loading;

  const reset = () => {
    setConfirmText('');
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleDelete = async () => {
    if (!canConfirm) return;
    setLoading(true);
    setError(null);
    const { error: deleteError } = await deleteAccount();
    if (deleteError) {
      setLoading(false);
      setError(deleteError);
      return;
    }
    // Success: the auth listener in app/_layout.tsx sees the session go null
    // and redirects to the welcome screen on its own — nothing to navigate
    // here. Modal unmounts along with the screen it was opened from.
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.dangerBorder,
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
                backgroundColor: COLORS.dangerDim,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="alert-triangle" size={18} color={COLORS.danger} />
            </View>
            <Text style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>Delete Account</Text>
          </View>

          <Text style={{ color: '#A1A1AA', fontSize: 12.5, lineHeight: 18, fontFamily: FONT }}>
            This permanently deletes your account and everything tied to it — workouts, meal and
            sleep logs, XP, streaks, all of it. This cannot be undone.
          </Text>

          <View>
            <Text style={{ color: '#71717A', fontSize: 11, marginBottom: 6, fontFamily: FONT }}>
              Type <Text style={{ color: '#fff', fontWeight: '700' }}>DELETE</Text> to confirm
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="DELETE"
              placeholderTextColor="#52525B"
              editable={!loading}
              style={{
                height: 44,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: COLORS.borderStrong,
                backgroundColor: 'rgba(255,255,255,0.03)',
                paddingHorizontal: 12,
                color: '#fff',
                fontSize: 14,
                fontFamily: FONT,
              }}
            />
          </View>

          {error ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, fontFamily: FONT }}>{error}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleClose}
              disabled={loading}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#A1A1AA', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                accent={COLORS.danger}
                accentDeep="#B91C1C"
                fullWidth
                disabled={!canConfirm}
                onPress={handleDelete}
              >
                {loading ? 'Deleting…' : 'Delete'}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
