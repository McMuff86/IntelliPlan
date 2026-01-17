import { useState, useCallback, useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'codex';

const THEME_STORAGE_KEY = 'intelliplan-theme-preference';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'codex', label: 'Codex' },
];

export function getStoredThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
  if (stored && THEME_OPTIONS.some((option) => option.value === stored)) {
    return stored;
  }
  return 'light';
}

export function setStoredThemePreference(theme: ThemePreference): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function useThemePreference() {
  const theme = useSyncExternalStore(subscribe, getStoredThemePreference, getStoredThemePreference);
  const [, setForceUpdate] = useState(0);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setStoredThemePreference(nextTheme);
    emitChange();
    setForceUpdate((prev) => prev + 1);
  }, []);

  return {
    theme,
    setTheme,
    themeOptions: THEME_OPTIONS,
  };
}
