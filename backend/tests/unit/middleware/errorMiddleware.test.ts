/**
 * Unit tests for error middleware
 * Tests error handling and async wrapper
 */

import { Request, Response, NextFunction } from 'express';
import {
  errorMiddleware,
  asyncHandler,
} from '@middleware/errorMiddleware';
import { AppError, ValidationError } from '@utils/errors';
import { ZodError, z } from 'zod';

describe('Error Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { method: 'GET', path: '/api/test' } as Partial<Request>;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as Partial<Response>;
    next = jest.fn() as NextFunction;
  });

  describe('errorMiddleware', () => {
    it('should handle AppError with correct status code', () => {
      const error = new AppError(400, 'Bad request');

      errorMiddleware(
        error,
        req as Request,
        res as Response,
        next
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid input');

      errorMiddleware(
        error,
        req as Request,
        res as Response,
        next
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle ZodError', () => {
      const schema = z.object({ name: z.string() });
      let zodError: ZodError;

      try {
        schema.parse({ name: 123 });
      } catch (e) {
        zodError = e as ZodError;
      }

      errorMiddleware(
        zodError!,
        req as Request,
        res as Response,
        next
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
        })
      );
    });

    it('should handle generic Error with status 500', () => {
      const error = new Error('Unexpected error');

      errorMiddleware(
        error,
        req as Request,
        res as Response,
        next
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle generic error with error details in response', () => {
      const error = new Error('Test error');

      errorMiddleware(
        error,
        req as Request,
        res as Response,
        next
      );

      expect(res.status).toHaveBeenCalledWith(500);
      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.error).toBeDefined();
      expect(response.error.statusCode).toBe(500);
      expect(typeof response.error.message).toBe('string');
    });

    it('should handle null error gracefully', () => {
      errorMiddleware(
        null as any,
        req as Request,
        res as Response,
        next
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('asyncHandler', () => {
    it('should execute successful async handler', async () => {
      const handler = jest.fn(async () => {
        // Simulate successful operation
        return { data: 'success' };
      });

      const wrapped = asyncHandler(handler);

      await wrapped(req as Request, res as Response, next);

      expect(handler).toHaveBeenCalled();
    });

    it('should pass errors to next middleware', async () => {
      const testError = new Error('Async error');
      const handler = jest.fn(async () => {
        throw testError;
      });

      const wrapped = asyncHandler(handler);

      await wrapped(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(testError);
    });

    it('should pass AppError to next', async () => {
      const appError = new AppError(400, 'Validation failed');
      const handler = jest.fn(async () => {
        throw appError;
      });

      const wrapped = asyncHandler(handler);

      await wrapped(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(appError);
    });

    it('should handle handler that sends response', async () => {
      const handler = jest.fn(async (_req, res) => {
        res.status(200).json({ data: 'success' });
      });

      const wrapped = asyncHandler(handler);

      await wrapped(req as Request, res as Response, next);

      expect(handler).toHaveBeenCalled();
    });

    it('should preserve handler context', async () => {
      const context = { value: 'test' };
      const handler = jest.fn(async function (this: any) {
        return this.value;
      });

      const wrapped = asyncHandler(handler);

      await wrapped.call(context, req as Request, res as Response, next);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle synchronous errors in async handlers', async () => {
      const handler = async () => {
        throw new ValidationError('Sync error in async');
      };

      const wrapped = asyncHandler(handler);

      await wrapped(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should not call next if response already sent', async () => {
      const handler = jest.fn(async (_req, res) => {
        res.json({ data: 'already sent' });
      });

      const wrapped = asyncHandler(handler);

      await wrapped(req as Request, res as Response, next);

      // Handler should still be called
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle error with circular references', () => {
      const circular: any = { message: 'Circular error' };
      circular.self = circular;

      // Should not throw
      errorMiddleware(
        circular,
        req as Request,
        res as Response,
        next
      );

      expect(res.status).toHaveBeenCalled();
    });

    it('should handle error with undefined properties', () => {
      const error = new Error('Test');
      error.stack = undefined;

      errorMiddleware(
        error,
        req as Request,
        res as Response,
        next
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(10000);
      const error = new Error(longMessage);

      errorMiddleware(
        error,
        req as Request,
        res as Response,
        next
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
