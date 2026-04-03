import { Platform } from 'react-native';

// ── Background Colors ──
export const BG = {
  main: '#080E1C',
  card: '#141B2D',
  input: '#0F172A',
  border: '#1E2A40',
  placeholder: '#2D3E55',
} as const;

// ── Text Colors ──
export const TX = {
  primary: '#F1F5F9',
  secondary: '#CBD5E1',
  label: '#475569',
  subtle: '#334155',
} as const;

// ── Category Accent Colors ──
export const Accent = {
  sports: '#FF6B35',
  study: '#818CF8',
  food: '#FBBF24',
  fitness: '#F87171',
  gaming: '#34D399',
  trips: '#38BDF8',
  campus: '#A78BFA',
  social: '#F472B6',
  other: '#94A3B8',
} as const;

// ── Status Colors ──
export const Status = {
  open: '#34D399',
  byRequest: '#FBBF24',
  notification: '#F472B6',
  error: '#F87171',
} as const;

// ── FAB ──
export const FAB_COLOR = '#818CF8';

// ── Font Weights ──
export const FW = {
  hero: '900' as const,
  header: '800' as const,
  cardTitle: '700' as const,
  body: '600' as const,
  caption: '500' as const,
};

// ── Border Radius ──
export const BR = {
  card: 24,
  button: 18,
  input: 14,
  smallButton: 12,
  pill: 20,
} as const;

// ── Legacy Colors (kept for themed components) ──
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: TX.primary,
    background: BG.main,
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
