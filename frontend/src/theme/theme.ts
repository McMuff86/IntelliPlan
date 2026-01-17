import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

const baseColors = {
  primary: '#0f766e',
  primaryLight: '#14b8a6',
  primaryDark: '#115e59',
  secondary: '#f97316',
  secondaryLight: '#fb923c',
  secondaryDark: '#c2410c',
  ink: '#0f172a',
  muted: '#475569',
  paper: '#ffffff',
  paperDark: '#0f172a',
};

const codexColors = {
  primary: '#10a37f',
  primaryLight: '#1bd7a2',
  primaryDark: '#0b7056',
  secondary: '#eab308',
  secondaryLight: '#facc15',
  secondaryDark: '#a16207',
  ink: '#e2e8f0',
  muted: '#94a3b8',
  paper: '#111827',
  paperDark: '#0b0f14',
};

const getThemeOptions = (mode: 'light' | 'dark' | 'codex'): ThemeOptions => {
  const isCodex = mode === 'codex';
  const isDark = mode === 'dark' || isCodex;
  const paletteMode = isDark ? 'dark' : 'light';
  const colors = isCodex ? codexColors : baseColors;
  const defaultBackground = isCodex ? '#0b0f14' : isDark ? '#0b1120' : '#f8fafc';
  const paperBackground = isCodex ? codexColors.paper : isDark ? baseColors.paperDark : baseColors.paper;
  const textPrimary = isDark ? (isCodex ? codexColors.ink : '#e2e8f0') : baseColors.ink;
  const textSecondary = isDark ? (isCodex ? codexColors.muted : '#94a3b8') : baseColors.muted;

  return {
    palette: {
      mode: paletteMode,
      primary: {
        main: colors.primary,
        light: colors.primaryLight,
        dark: colors.primaryDark,
      },
      secondary: {
        main: colors.secondary,
        light: colors.secondaryLight,
        dark: colors.secondaryDark,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      background: {
        default: defaultBackground,
        paper: paperBackground,
      },
    },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: isCodex
            ? 'rgba(2, 6, 23, 0.92)'
            : isDark
              ? 'rgba(2, 6, 23, 0.95)'
              : 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: isDark ? '1px solid rgba(148, 163, 184, 0.16)' : '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: isDark ? '0 24px 48px rgba(0, 0, 0, 0.45)' : '0 24px 48px rgba(15, 23, 42, 0.12)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: isDark ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: isDark ? '0 18px 40px rgba(0, 0, 0, 0.4)' : '0 18px 40px rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: isDark ? colors.primaryLight : colors.primary,
            outlineOffset: 2,
          },
        },
        containedPrimary: {
          boxShadow: isDark
            ? '0 12px 30px rgba(15, 118, 110, 0.4)'
            : '0 12px 30px rgba(15, 118, 110, 0.28)',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: isDark ? colors.primaryLight : colors.primary,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: isDark ? colors.primaryLight : colors.primary,
            outlineOffset: -2,
          },
        },
      },
    },
  },
  };
};

export const lightTheme = createTheme(getThemeOptions('light'));
export const darkTheme = createTheme(getThemeOptions('dark'));
export const codexTheme = createTheme(getThemeOptions('codex'));

export default lightTheme;
