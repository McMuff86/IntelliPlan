import { useState, useCallback, useSyncExternalStore } from 'react';

const TIMEZONE_STORAGE_KEY = 'intelliplan-preferred-timezone';

export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Zurich',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function getStoredTimezone(): string {
  const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
  if (stored && COMMON_TIMEZONES.includes(stored)) {
    return stored;
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function setStoredTimezone(timezone: string): void {
  localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
}

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function useTimezone() {
  const timezone = useSyncExternalStore(subscribe, getStoredTimezone, getStoredTimezone);
  const [, setForceUpdate] = useState(0);

  const setTimezone = useCallback((newTimezone: string) => {
    setStoredTimezone(newTimezone);
    emitChange();
    setForceUpdate((prev) => prev + 1);
  }, []);

  return {
    timezone,
    setTimezone,
    availableTimezones: COMMON_TIMEZONES,
  };
}
