/**
 * Unified Design System Configuration for CRITIC Platform
 * Single source of truth for all brand colors, opacity variants, and Google Fonts typography.
 */

export const THEME = {
  colors: {
    // Section 9 Brand Palette
    accentCyan: '#37F3FF',
    bgPrimary: '#0F172E',
    bgDeep: '#070B1A',
    bgCard: '#101B37',
    textLight: '#EAF6FF',
    textSoft: '#D9DFF7',
    accentPurple: '#A855F7',
    mutedSlateBlue: '#8FA6C9',

    // Alpha Variants & Accents
    accentCyan20: 'rgba(55, 243, 255, 0.20)',
    accentCyan50: 'rgba(55, 243, 255, 0.50)',
    accentPurple20: 'rgba(168, 85, 247, 0.20)',
    accentPink: '#FF4FD8',
    mutedBlue: '#53A0C4',
    textLight60: 'rgba(234, 246, 255, 0.60)',
    borderCyan: 'rgba(55, 243, 255, 0.40)',
    borderPurple: 'rgba(168, 85, 247, 0.40)',
    borderSlate: '#445168',
    borderSlate50: 'rgba(68, 81, 104, 0.50)',
    slateBlue45: 'rgba(143, 166, 201, 0.45)',
  },
  fonts: {
    // Section 9 Fonts
    spaceGrotesk: "'Space Grotesk', sans-serif",
    exo2: "'Exo 2', sans-serif",
    display: "'Space Grotesk', sans-serif",
    body: "'Exo 2', sans-serif",

    // Legacy Aliases
    orbitron: "'Space Grotesk', 'Orbitron', sans-serif",
    audiowide: "'Space Grotesk', cursive",
    inclusiveSans: "'Exo 2', 'Inclusive Sans', sans-serif",
    rajdhani: "'Space Grotesk', 'Rajdhani', sans-serif",
    spaceMono: "'Space Grotesk', monospace",
  },
} as const;

export type ThemeColors = typeof THEME.colors;
export type ThemeFonts = typeof THEME.fonts;
