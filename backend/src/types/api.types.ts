/**
 * Common API response types
 */

/**
 * Successful API response format
 */
export interface ApiResponse<T> {
  data: T;
  success: true;
}

/**
 * Error API response format
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response format
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
