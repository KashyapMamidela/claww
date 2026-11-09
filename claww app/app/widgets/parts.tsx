import React from 'react';
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { glassSvg, iconSvg, ringsSvg, type RingSpec } from '../lib/widgetSvg';
import { F, W } from './theme';

// Small building blocks shared by the widgets.

type Hex = `#${string}`;
type Color = Hex | `rgba(${number}, ${number}, ${number}, ${number})`;

export function Icon({ name, color, size = 16, strokeWidth = 2.2, fill }: { name: string; color: string; size?: number; strokeWidth?: number; fill?: string }) {
  return <SvgWidget svg={iconSvg(name, color, strokeWidth, fill)} style={{ width: size, height: size }} />;
}

/** A progress bar of a known width (widgets have no percentage widths). */
export function Bar({ width, pct, color, track, height = 5 }: { width: number; pct: number; color: Color; track?: Color; height?: number }) {
  const w = Math.max(0, Math.round(width));
  const fill = Math.round(w * Math.max(0, Math.min(1, pct)));
  return (
    <FlexWidget style={{ width: w, height, borderRadius: height / 2, backgroundColor: track ?? W.track, flexDirection: 'row' }}>
      {fill > 0 ? <FlexWidget style={{ width: Math.max(height, fill), height, borderRadius: height / 2, backgroundColor: color }} /> : null}
    </FlexWidget>
  );
}

/** Rings with text in the middle. */
export function Rings({ size, rings, stroke, gap, children }: { size: number; rings: RingSpec[]; stroke?: number; gap?: number; children?: React.ReactNode }) {
  const s = Math.max(40, Math.round(size));
  return (
    <OverlapWidget style={{ width: s, height: s }}>
      <SvgWidget svg={ringsSvg(rings, stroke, gap)} style={{ width: s, height: s }} />
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>{children}</FlexWidget>
    </OverlapWidget>
  );
}

export function T({ text, size, font = F.sb, color = W.text, lines = 1 }: { text: string; size: number; font?: string; color?: string; lines?: number }) {
  return <TextWidget text={text} maxLines={lines} truncate="END" style={{ fontSize: size, fontFamily: font, color: color as Hex }} />;
}

/**
 * The liquid glass card: a smoked, partly see-through pane drawn as an SVG (glassSvg) with the content laid over it.
 * The SVG draws the rounded corners, so the root has no background of its own and the wallpaper shows through.
 */
export function GlassCard({
  width,
  height,
  tint,
  tint2,
  children,
  click = 'OPEN_APP',
  data,
  row = false,
  center = false,
}: {
  width: number;
  height: number;
  tint: string;
  tint2: string;
  children: React.ReactNode;
  click?: string;
  data?: Record<string, unknown>;
  row?: boolean;
  center?: boolean;
}) {
  return (
    <OverlapWidget clickAction={click} clickActionData={data} style={{ width: 'match_parent', height: 'match_parent' }}>
      <SvgWidget svg={glassSvg(width, height, tint, tint2, W.radius)} style={{ width: 'match_parent', height: 'match_parent' }} />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          padding: W.pad,
          flexDirection: row ? 'row' : 'column',
          justifyContent: center ? 'center' : 'flex-start',
          alignItems: center ? 'center' : 'flex-start',
        }}
      >
        {children}
      </FlexWidget>
    </OverlapWidget>
  );
}

export function Spacer({ w = 0, h = 0 }: { w?: number; h?: number }) {
  return <FlexWidget style={{ width: w || 1, height: h || 1 }} />;
}

export function Grow() {
  return <FlexWidget style={{ flex: 1, height: 1 }} />;
}

/** A round icon button. */
export function RoundButton({ icon, bg, color, size = 34, click, data, label }: { icon: string; bg: Color; color: string; size?: number; click: string; data?: Record<string, unknown>; label: string }) {
  return (
    <FlexWidget clickAction={click} clickActionData={data} accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Icon name={icon} color={color} size={Math.round(size * 0.5)} strokeWidth={2.6} />
    </FlexWidget>
  );
}

/** A pill button with a label (and an optional icon before it). */
export function Pill({
  text,
  bg,
  color,
  click,
  data,
  label,
  height = 36,
  width,
  icon,
  iconColor,
  size = 14,
}: {
  text: string;
  bg: Color;
  color: Hex;
  click: string;
  data?: Record<string, unknown>;
  label: string;
  height?: number;
  width?: number | 'match_parent';
  icon?: string;
  iconColor?: string;
  size?: number;
}) {
  return (
    <FlexWidget
      clickAction={click}
      clickActionData={data}
      accessibilityLabel={label}
      style={{ width: width ?? 'match_parent', height, borderRadius: height / 2, backgroundColor: bg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 }}
    >
      {icon ? <Icon name={icon} color={iconColor ?? color} size={size} strokeWidth={2.6} /> : null}
      {icon ? <Spacer w={5} /> : null}
      <TextWidget text={text} style={{ fontSize: size, fontFamily: F.b, color }} />
    </FlexWidget>
  );
}

export function SignedOut({ width, height }: { width: number; height: number }) {
  return (
    <GlassCard width={width} height={height} tint="#3B82F6" tint2="#2DD4BF" center>
      <T text="CLAWW" size={13} font={F.xb} color={W.muted} />
      <Spacer h={6} />
      <T text="Open the app to sign in" size={14} font={F.sb} />
    </GlassCard>
  );
}
