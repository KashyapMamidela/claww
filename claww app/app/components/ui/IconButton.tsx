import React from 'react';
import { PressScale } from './PressScale';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: number;
  /** What a screen reader says: icon buttons have no text of their own. */
  label: string;
}

export function IconButton({ icon, onPress, size = 34, label }: IconButtonProps) {
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      scaleTo={0.92}
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </PressScale>
  );
}
