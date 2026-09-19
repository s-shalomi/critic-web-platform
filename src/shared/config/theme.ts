/**
 * Unified Design System Configuration for CRITIC Platform
 * Single source of truth for all brand colors, opacity variants, and Google Fonts typography.
 */

export const THEME = {
  colors: {
    bgPrimary: '#0F172E',
    bgDeep: '#070B1A',
    accentPink: '#FF4FD8',
    accentCyan: '#37F3FF',
    accentCyan20: 'rgba(55, 243, 255, 0.20)',
    accentCyan50: 'rgba(55, 243, 255, 0.50)',
    mutedBlue: '#53A0C4',
    textLight: '#EAF6FF',
    textLight60: 'rgba(234, 246, 255, 0.60)',
    textSoft: '#D9DFF7',
    borderSlate: '#445168',
    borderSlate50: 'rgba(68, 81, 104, 0.50)',
    slateBlue45: 'rgba(143, 166, 201, 0.45)',
  },
  fonts: {
    orbitron: "'Orbitron', sans-serif",
    spaceGrotesk: "'Space Grotesk', sans-serif",
    audiowide: "'Audiowide', cursive",
    exo2: "'Exo 2', sans-serif",
    inclusiveSans: "'Inclusive Sans', sans-serif",
    rajdhani: "'Rajdhani', sans-serif",
    spaceMono: "'Space Mono', monospace",
  },
} as const;

export type ThemeColors = typeof THEME.colors;
export type ThemeFonts = typeof THEME.fonts;
