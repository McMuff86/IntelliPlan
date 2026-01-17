import { useState, useCallback, useSyncExternalStore } from 'react';

export type LayoutPreference = 'standard' | 'wide';

const LAYOUT_STORAGE_KEY = 'intelliplan-layout-preference';

const LAYOUT_OPTIONS: { value: LayoutPreference; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'wide', label: 'Wide' },
];

export function getStoredLayoutPreference(): LayoutPreference {
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY) as LayoutPreference | null;
  if (stored && LAYOUT_OPTIONS.some((option) => option.value === stored)) {
    return stored;
  }
  return 'wide';
}

export function setStoredLayoutPreference(layout: LayoutPreference): void {
  localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
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

export function useLayoutPreference() {
  const layout = useSyncExternalStore(subscribe, getStoredLayoutPreference, getStoredLayoutPreference);
  const [, setForceUpdate] = useState(0);

  const setLayout = useCallback((nextLayout: LayoutPreference) => {
    setStoredLayoutPreference(nextLayout);
    emitChange();
    setForceUpdate((prev) => prev + 1);
  }, []);

  return {
    layout,
    setLayout,
    layoutOptions: LAYOUT_OPTIONS,
  };
}
