/**
 * Base application error class.
 * All application errors should extend this class.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - thrown when request validation fails.
 * Returns 400 Bad Request HTTP status.
 */
export class ValidationError extends AppError {
  public readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(400, message);
    Object.setPrototypeOf(this, ValidationError.prototype);
    this.details = details;
  }
}

/**
 * Authentication error - thrown when user is not authenticated.
 * Returns 401 Unauthorized HTTP status.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Authorization error - thrown when user lacks required permissions.
 * Returns 403 Forbidden HTTP status.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not found error - thrown when a requested resource doesn't exist.
 * Returns 404 Not Found HTTP status.
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error - thrown when request conflicts with existing data.
 * Returns 409 Conflict HTTP status.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Internal server error - thrown for unexpected server errors.
 * Returns 500 Internal Server Error HTTP status.
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message, false);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * Database error - thrown when database operation fails.
 * Returns 500 Internal Server Error HTTP status.
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database error') {
    super(500, message, false);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Check if error is an instance of AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
