/**
 * Shared Hooks – Public API
 *
 * Re-exportiert alle shared hooks:
 *   import { useApi, useDebounce, useWeekNavigation } from '@/shared/hooks';
 */

export { useApi, useMutation } from './useApi';
export type { UseApiOptions, UseApiResult, UseMutationOptions, UseMutationResult } from './useApi';

export { useWeekNavigation, getCurrentWeek, getISOWeekNumber, getISOWeekYear, getISOWeeksInYear, getWeekDateRange, formatKW } from './useWeekNavigation';
export type { UseWeekNavigationResult } from './useWeekNavigation';

export { useDebounce, useDebouncedCallback } from './useDebounce';
