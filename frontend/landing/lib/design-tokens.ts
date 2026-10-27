export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'contractguard-theme';

export const DESIGN_TOKENS = {
  dark: {
    bg: '#0B1020',
    surfaceGlass: 'rgba(18, 26, 46, 0.72)',
    surfaceGlassStrong: 'rgba(20, 29, 51, 0.82)',
    surfaceSolid: '#0C1324',
    surfaceSolidHeader: '#131D35',
    borderGlass: 'rgba(148, 163, 184, 0.16)',
    borderSolid: '#24324F',
    text: '#EEF2FA',
    muted: '#9FB0CC',
    accent: '#10B981',
    accentFg: '#041610',
    ai: '#94A3B8',
    danger: '#F87171',
    warning: '#FBBF24',
  },
  light: {
    bg: '#F4F6FA',
    surfaceGlass: 'rgba(255, 255, 255, 0.78)',
    surfaceGlassStrong: 'rgba(255, 255, 255, 0.88)',
    surfaceSolid: '#FFFFFF',
    surfaceSolidHeader: '#F1F5F9',
    borderGlass: 'rgba(15, 23, 42, 0.09)',
    borderSolid: '#CBD5E1',
    text: '#0F172A',
    muted: '#475569',
    accent: '#059669',
    accentFg: '#FFFFFF',
    ai: '#334155',
    danger: '#DC2626',
    warning: '#B45309',
  },
} as const;
