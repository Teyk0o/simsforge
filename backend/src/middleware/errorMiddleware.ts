import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '@utils/logger';
import { isAppError, ValidationError } from '@utils/errors';
import { env } from '@config/environment';

/**
 * Global error handling middleware.
 * Catches all errors from route handlers and formats responses.
 * Must be registered LAST in middleware stack.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  if (err instanceof Error) {
    logger.error('Request error', {
      message: err.message,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  } else {
    logger.error('Unknown error', { error: String(err) });
  }

  // Handle AppError instances
  if (isAppError(err)) {
    const response: any = {
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    };

    // Include details if it's a ValidationError
    if (err instanceof ValidationError && err.details) {
      response.error.details = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: err.issues.map((e: any) => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      },
    });
    return;
  }

  // Handle generic Error instances
  if (err instanceof Error) {
    res.status(500).json({
      error: {
        message:
          env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        statusCode: 500,
      },
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    error: {
      message: 'Internal server error',
      statusCode: 500,
    },
  });
}

/**
 * Async route handler wrapper to catch Promise rejections.
 * Wraps async route handlers and forwards errors to error middleware.
 *
 * @example
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
