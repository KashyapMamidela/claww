import React from 'react';
import { PressScale } from './PressScale';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: number;
}

export function IconButton({ icon, onPress, size = 34 }: IconButtonProps) {
  return (
    <PressScale
      onPress={onPress}
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
