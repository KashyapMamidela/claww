import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../../lib/theme';
import { Icon } from './Icon';

export interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * Reusable card for an API/generation failure, with an optional retry
 * action — the one error surface every screen should use instead of a
 * one-off red Text line.
 */
export function ErrorCard({ message, onRetry, retrying = false }: ErrorCardProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: COLORS.dangerDim,
        borderWidth: 1,
        borderColor: COLORS.dangerBorder,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 13,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: 'rgba(239,68,68,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="alert-triangle" size={15} color={COLORS.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '600', lineHeight: 18, fontFamily: FONT }}>{message}</Text>
        {onRetry ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onRetry} disabled={retrying} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
            <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '700', fontFamily: FONT }}>
              {retrying ? 'Retrying…' : 'Retry'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
