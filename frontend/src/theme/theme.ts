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

const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: baseColors.primary,
      light: baseColors.primaryLight,
      dark: baseColors.primaryDark,
    },
    secondary: {
      main: baseColors.secondary,
      light: baseColors.secondaryLight,
      dark: baseColors.secondaryDark,
    },
    text: {
      primary: mode === 'light' ? baseColors.ink : '#e2e8f0',
      secondary: mode === 'light' ? baseColors.muted : '#94a3b8',
    },
    background: {
      default: mode === 'light' ? '#f8fafc' : '#0b1120',
      paper: mode === 'light' ? baseColors.paper : baseColors.paperDark,
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
          background: mode === 'light' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(2, 6, 23, 0.95)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.12)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
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
            outlineColor: mode === 'light' ? baseColors.primary : '#99f6e4',
            outlineOffset: 2,
          },
        },
        containedPrimary: {
          boxShadow: '0 12px 30px rgba(15, 118, 110, 0.28)',
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
            outlineColor: mode === 'light' ? baseColors.primary : '#99f6e4',
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
            outlineColor: mode === 'light' ? baseColors.primary : '#99f6e4',
            outlineOffset: -2,
          },
        },
      },
    },
  },
});

export const lightTheme = createTheme(getThemeOptions('light'));
export const darkTheme = createTheme(getThemeOptions('dark'));

export default lightTheme;
