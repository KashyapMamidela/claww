import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { SURFACES } from '../../lib/theme';

// NG PHASE 1 (build plan 5.3): an inset area, darker than the card around it, with an
// inner shadow. Sits behind steppers, segmented controls and a pen mark's reason.

export interface WellProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
}

export function Well({ children, style, padding = 3, radius = 14 }: WellProps) {
  return (
    <View
      style={[
        {
          backgroundColor: SURFACES.well,
          borderRadius: radius,
          padding,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.05)',
          boxShadow: 'inset 0px 2px 6px rgba(0,0,0,0.65)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
