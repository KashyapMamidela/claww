import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';
import { activityIcon } from '../../lib/activities';
import { Icon } from '../ui/Icon';

// An activity's logo. Cricket, football and badminton have no icon in the icon set, so they are drawn here in the same
// 24 px line style (2 px round strokes); every other activity uses its icon. Pure decoration: hidden from screen readers
// by the parent, which always carries the activity's name as text.

function Cricket({ size, color, w }: { size: number; color: string; w: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={8.2} y={7.5} width={5.6} height={13} rx={1.6} transform="rotate(-42 11 14)" />
      <Path d="M6.2 4.2 L9.4 7.4" />
      <Circle cx={18.4} cy={5.6} r={2.1} />
    </Svg>
  );
}

function Football({ size, color, w }: { size: number; color: string; w: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Polygon points="12,8 15.4,10.5 14.1,14.4 9.9,14.4 8.6,10.5" />
      <Line x1={12} y1={8} x2={12} y2={3.2} />
      <Line x1={15.4} y1={10.5} x2={19.6} y2={9} />
      <Line x1={14.1} y1={14.4} x2={16.8} y2={18.2} />
      <Line x1={9.9} y1={14.4} x2={7.2} y2={18.2} />
      <Line x1={8.6} y1={10.5} x2={4.4} y2={9} />
    </Svg>
  );
}

function Badminton({ size, color, w }: { size: number; color: string; w: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={18.4} r={2.7} />
      <Path d="M9.8 16.4 L6.2 4.6" />
      <Path d="M14.2 16.4 L17.8 4.6" />
      <Path d="M12 15.7 L12 4.4" />
      <Path d="M6.2 4.6 Q12 2.2 17.8 4.6" />
    </Svg>
  );
}

export function ActivityLogo({ name, size = 24, color = '#FBBF24', strokeWidth = 2 }: { name: string; size?: number; color?: string; strokeWidth?: number }) {
  const icon = activityIcon(name);
  if (icon === 'cricket') return <Cricket size={size} color={color} w={strokeWidth} />;
  if (icon === 'football') return <Football size={size} color={color} w={strokeWidth} />;
  if (icon === 'badminton') return <Badminton size={size} color={color} w={strokeWidth} />;
  return <Icon name={icon} size={size} color={color} strokeWidth={strokeWidth} />;
}
