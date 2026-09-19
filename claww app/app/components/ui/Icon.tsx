import React from 'react';
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Download,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  Lock,
  LogOut,
  Moon,
  Pause,
  Play,
  Plus,
  Repeat,
  Settings,
  Share2,
  Shield,
  SkipForward,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  UserCircle2,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

// Maps the kebab-case Lucide names used across the design sources to
// the lucide-react-native components.
const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  'alert-triangle': AlertTriangle,
  apple: Apple,
  'arrow-up-right': ArrowUpRight,
  bell: Bell,
  camera: Camera,
  check: Check,
  'check-circle-2': CheckCircle2,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  circle: Circle,
  clock: Clock,
  download: Download,
  droplets: Droplets,
  dumbbell: Dumbbell,
  flame: Flame,
  footprints: Footprints,
  'help-circle': HelpCircle,
  home: Home,
  image: ImageIcon,
  info: Info,
  'layout-grid': LayoutGrid,
  lock: Lock,
  'log-out': LogOut,
  moon: Moon,
  pause: Pause,
  play: Play,
  plus: Plus,
  repeat: Repeat,
  settings: Settings,
  'share-2': Share2,
  shield: Shield,
  'skip-forward': SkipForward,
  smartphone: Smartphone,
  sparkles: Sparkles,
  star: Star,
  'trending-up': TrendingUp,
  trophy: Trophy,
  'user-circle-2': UserCircle2,
  'wand-2': Wand2,
  x: X,
  zap: Zap,
};

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, color = '#A1A1AA', strokeWidth = 1.7 }: IconProps) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
