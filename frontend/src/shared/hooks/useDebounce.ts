import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * useDebounce – Debounces a value by a given delay.
 *
 * Useful for search inputs, filter text, etc. to avoid
 * triggering API calls on every keystroke.
 *
 * @example
 * ```tsx
 * const [searchText, setSearchText] = useState('');
 * const debouncedSearch = useDebounce(searchText, 300);
 *
 * // This effect only runs 300ms after the user stops typing
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     searchService.search(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * useDebouncedCallback – Debounces a callback function.
 *
 * The callback will only be invoked after the specified delay
 * since the last call. Useful for event handlers.
 *
 * @example
 * ```tsx
 * const debouncedSave = useDebouncedCallback((value: string) => {
 *   api.save(value);
 * }, 500);
 *
 * return <input onChange={(e) => debouncedSave(e.target.value)} />;
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delayMs: number = 300
): T {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Always use the latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const debouncedFn = useMemo(() => {
    const fn = (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    };
    return fn as unknown as T;
  }, [delayMs]);

  return debouncedFn;
}
