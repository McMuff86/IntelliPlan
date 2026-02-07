import { useCallback, useMemo, useState } from 'react';
import type { WeekNavigationState } from '../types/wochenplan';

/**
 * useWeekNavigation – KW Vor/Zurück/Today Navigation
 *
 * Extrahiert die Wochenplan-Navigation in einen wiederverwendbaren Hook.
 *
 * @example
 * ```tsx
 * const { kw, year, isCurrentWeek, goNext, goPrev, goToday, dateRange } = useWeekNavigation();
 *
 * return (
 *   <div>
 *     <button onClick={goPrev}>← Vorherige KW</button>
 *     <span>KW {kw} / {year}</span>
 *     <button onClick={goNext}>Nächste KW →</button>
 *     {!isCurrentWeek && <button onClick={goToday}>Heute</button>}
 *   </div>
 * );
 * ```
 */
export function useWeekNavigation(
  initialKw?: number,
  initialYear?: number
): UseWeekNavigationResult {
  const current = getCurrentWeek();

  const [kw, setKw] = useState(initialKw ?? current.kw);
  const [year, setYear] = useState(initialYear ?? current.year);

  const isCurrentWeek = kw === current.kw && year === current.year;

  const dateRange = useMemo(() => getWeekDateRange(kw, year), [kw, year]);

  const goNext = useCallback(() => {
    const maxWeek = getISOWeeksInYear(year);
    if (kw >= maxWeek) {
      setKw(1);
      setYear((y) => y + 1);
    } else {
      setKw((k) => k + 1);
    }
  }, [kw, year]);

  const goPrev = useCallback(() => {
    if (kw <= 1) {
      const prevYear = year - 1;
      setKw(getISOWeeksInYear(prevYear));
      setYear(prevYear);
    } else {
      setKw((k) => k - 1);
    }
  }, [kw, year]);

  const goToday = useCallback(() => {
    const now = getCurrentWeek();
    setKw(now.kw);
    setYear(now.year);
  }, []);

  const goToWeek = useCallback((targetKw: number, targetYear: number) => {
    const maxWeek = getISOWeeksInYear(targetYear);
    setKw(Math.max(1, Math.min(targetKw, maxWeek)));
    setYear(targetYear);
  }, []);

  const state: WeekNavigationState = {
    kw,
    year,
    isCurrentWeek,
    dateRange: {
      from: dateRange.from,
      to: dateRange.to,
    },
  };

  return {
    ...state,
    dates: dateRange.dates,
    goNext,
    goPrev,
    goToday,
    goToWeek,
  };
}

// ─── Types ─────────────────────────────────────────────

export interface UseWeekNavigationResult extends WeekNavigationState {
  /** All 5 weekday dates (Mon-Fri) as ISO strings */
  dates: string[];
  /** Navigate to next week */
  goNext: () => void;
  /** Navigate to previous week */
  goPrev: () => void;
  /** Navigate to current week */
  goToday: () => void;
  /** Navigate to a specific week */
  goToWeek: (kw: number, year: number) => void;
}

// ─── Helpers ───────────────────────────────────────────

/** Get the current ISO week number and year */
export function getCurrentWeek(): { kw: number; year: number } {
  const now = new Date();
  const kw = getISOWeekNumber(now);
  const year = getISOWeekYear(now);
  return { kw, year };
}

/** Calculate ISO week number for a given date */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Make Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Set to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Get the ISO week year (may differ from calendar year at year boundaries) */
export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/** Get number of ISO weeks in a year (52 or 53) */
export function getISOWeeksInYear(year: number): number {
  const dec28 = new Date(Date.UTC(year, 11, 28));
  return getISOWeekNumber(dec28);
}

/** Get the Monday–Friday date range for an ISO week */
export function getWeekDateRange(
  kw: number,
  year: number
): { from: string; to: string; dates: string[] } {
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // 1=Mon … 7=Sun
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (kw - 1) * 7);

  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  return {
    from: dates[0],
    to: dates[4],
    dates,
  };
}

/** Format a KW for display: "KW 07 / 2026" */
export function formatKW(kw: number, year: number): string {
  return `KW ${String(kw).padStart(2, '0')} / ${year}`;
}
