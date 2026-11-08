import React from 'react';
import { PressScale } from './PressScale';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: number;
  /** What a screen reader says: icon buttons have no text of their own. */
  label: string;
}

export function IconButton({ icon, onPress, size = 40, label }: IconButtonProps) {
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      scaleTo={0.92}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
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
