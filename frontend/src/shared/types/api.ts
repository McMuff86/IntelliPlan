/**
 * Generic API Response Types
 *
 * Standardisierte Response-Strukturen für alle API-Calls.
 * Spiegelt die Backend-Response-Patterns wider.
 */

// ─── Success Responses ─────────────────────────────────

/** Standard API success response wrapping data */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Success response with additional message */
export interface ApiResponseWithMessage<T> {
  success: true;
  data: T;
  message: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

/** Pagination metadata returned by the API */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ─── Error Responses ───────────────────────────────────

/** Standard API error response */
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: ValidationError[];
}

/** Validation error for a specific field */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// ─── Union Type ────────────────────────────────────────

/** Combined response type (success or error) */
export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Request Types ─────────────────────────────────────

/** Standard pagination params for list endpoints */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/** Standard query params for list endpoints with search */
export interface ListParams extends PaginationParams {
  q?: string;
  sortBy?: string;
  sortOrder?: SortDirection;
}

export type SortDirection = 'asc' | 'desc';

// ─── Fetch State ───────────────────────────────────────

/** State for async data fetching (used by useApi hook) */
export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Extended fetch state with refetch capability */
export interface FetchStateWithRefetch<T> extends FetchState<T> {
  refetch: () => Promise<void>;
}

// ─── Type Guards ───────────────────────────────────────

export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as ApiError).success === false
  );
}

export function isApiSuccess<T>(response: ApiResult<T>): response is ApiResponse<T> {
  return response.success === true;
}
