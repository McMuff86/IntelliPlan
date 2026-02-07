import { useCallback, useEffect, useRef, useState } from 'react';
import type { FetchState } from '../types/api';

/**
 * useApi – Generic data fetching hook with loading, error, and refetch.
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useApi(
 *   () => wochenplanService.getWeekPlan(kw, year),
 *   [kw, year]
 * );
 * ```
 *
 * @param fetchFn - Async function that returns data
 * @param deps - Dependencies that trigger a refetch when changed
 * @param options - Optional configuration
 */
export function useApi<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiOptions = {}
): UseApiResult<T> {
  const { immediate = true, onError, onSuccess } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);
  // Track the latest fetch to prevent race conditions
  const fetchIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchFn();

      // Only update state if this is still the latest fetch and component is mounted
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setState({ data, loading: false, error: null });
        onSuccess?.(data);
      }

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten';

      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setState({ data: null, loading: false, error: errorMessage });
        onError?.(errorMessage);
      }

      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Auto-fetch on mount and when deps change
  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, immediate]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    refetch: execute,
    reset,
  };
}

// ─── Types ─────────────────────────────────────────────

export interface UseApiOptions {
  /** Whether to fetch immediately on mount (default: true) */
  immediate?: boolean;
  /** Callback on successful fetch */
  onSuccess?: (data: unknown) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseApiResult<T> extends FetchState<T> {
  /** Re-execute the fetch function */
  refetch: () => Promise<T | null>;
  /** Reset state to initial values */
  reset: () => void;
}

/**
 * useMutation – Hook for write operations (POST, PUT, DELETE).
 *
 * Unlike useApi, this does NOT auto-execute. Call `mutate()` to trigger.
 *
 * @example
 * ```tsx
 * const { mutate, loading } = useMutation(
 *   (data: CreateAssignmentDTO) => assignmentService.create(data),
 *   { onSuccess: () => refetchWeekPlan() }
 * );
 *
 * const handleSubmit = () => mutate({ taskId, resourceId, ... });
 * ```
 */
export function useMutation<TData, TParams = void>(
  mutationFn: (params: TParams) => Promise<TData>,
  options: UseMutationOptions<TData> = {}
): UseMutationResult<TData, TParams> {
  const { onSuccess, onError } = options;

  const [state, setState] = useState<FetchState<TData>>({
    data: null,
    loading: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (params: TParams): Promise<TData | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const data = await mutationFn(params);

        if (mountedRef.current) {
          setState({ data, loading: false, error: null });
          onSuccess?.(data);
        }

        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten';

        if (mountedRef.current) {
          setState({ data: null, loading: false, error: errorMessage });
          onError?.(errorMessage);
        }

        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutationFn]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
}

export interface UseMutationOptions<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: string) => void;
}

export interface UseMutationResult<TData, TParams> extends FetchState<TData> {
  mutate: (params: TParams) => Promise<TData | null>;
  reset: () => void;
}
