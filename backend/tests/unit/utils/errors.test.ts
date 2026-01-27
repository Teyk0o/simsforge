/**
 * Unit tests for error utilities
 * Tests error classes and type guards
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  isAppError,
} from '@utils/errors';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create AppError with provided status code', () => {
      const error = new AppError(500, 'Server error');

      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create AppError with custom status code', () => {
      const error = new AppError(400, 'Bad request');

      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
    });

    it('should create AppError with isOperational flag', () => {
      const operationalError = new AppError(500, 'Error', true);
      const nonOperationalError = new AppError(500, 'Error', false);

      expect(operationalError.isOperational).toBe(true);
      expect(nonOperationalError.isOperational).toBe(false);
    });

    it('should be instanceof Error', () => {
      const error = new AppError(500, 'Test');

      expect(error instanceof Error).toBe(true);
    });

    it('should have stack trace', () => {
      const error = new AppError(500, 'Test');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack!.length).toBeGreaterThan(0);
    });

    it('should have message and statusCode properties', () => {
      const error = new AppError(400, 'Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(typeof error.message).toBe('string');
      expect(typeof error.statusCode).toBe('number');
    });

    it('should set correct prototype chain', () => {
      const error = new AppError(500, 'Test');

      expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
    });
  });

  describe('ValidationError', () => {
    it('should extend AppError with status 400', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error instanceof AppError).toBe(true);
    });

    it('should support validation details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Invalid input', details);

      expect(error.details).toEqual(details);
    });

    it('should be instanceof AppError', () => {
      const error = new ValidationError('Invalid');

      expect(error instanceof AppError).toBe(true);
    });

    it('should be instanceof Error', () => {
      const error = new ValidationError('Invalid');

      expect(error instanceof Error).toBe(true);
    });

    it('should set correct prototype chain', () => {
      const error = new ValidationError('Test');

      expect(Object.getPrototypeOf(error)).toBe(ValidationError.prototype);
    });
  });

  describe('NotFoundError', () => {
    it('should extend AppError with status 404', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });

    it('should format resource name correctly', () => {
      const errors = [
        { resource: 'User', expected: 'User not found' },
        { resource: 'Post', expected: 'Post not found' },
        { resource: 'Mod', expected: 'Mod not found' },
      ];

      errors.forEach(({ resource, expected }) => {
        const error = new NotFoundError(resource);
        expect(error.message).toBe(expected);
      });
    });

    it('should be instanceof AppError', () => {
      const error = new NotFoundError('Not found');

      expect(error instanceof AppError).toBe(true);
    });

    it('should be instanceof Error', () => {
      const error = new NotFoundError('Resource');

      expect(error instanceof Error).toBe(true);
    });

    it('should set correct prototype chain', () => {
      const error = new NotFoundError('Test');

      expect(Object.getPrototypeOf(error)).toBe(NotFoundError.prototype);
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError(500, 'Test');

      expect(isAppError(error)).toBe(true);
    });

    it('should return true for ValidationError', () => {
      const error = new ValidationError('Invalid');

      expect(isAppError(error)).toBe(true);
    });

    it('should return true for NotFoundError', () => {
      const error = new NotFoundError('Not found');

      expect(isAppError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');

      expect(isAppError(error)).toBe(false);
    });

    it('should return false for plain object', () => {
      const error = { message: 'Object error' };

      expect(isAppError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isAppError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAppError(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isAppError('error string')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isAppError(404)).toBe(false);
    });

    it('should return false for boolean', () => {
      expect(isAppError(true)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isAppError([])).toBe(false);
    });

    it('should return false for object with statusCode property', () => {
      const fakeError = { statusCode: 500, message: 'Error' };

      expect(isAppError(fakeError)).toBe(false);
    });
  });

  describe('error properties', () => {
    it('should preserve all error properties', () => {
      const error = new AppError(503, 'Service unavailable');

      expect(error.message).toBeDefined();
      expect(error.statusCode).toBeDefined();
      expect(error.isOperational).toBeDefined();
      expect(error.name).toBe('Error');
      expect(error.stack).toBeDefined();
    });

    it('should handle status codes for all HTTP error classes', () => {
      const statusCodes = [400, 401, 403, 404, 409, 422, 500, 502, 503];

      statusCodes.forEach((code) => {
        const error = new AppError(code, 'Error');
        expect(error.statusCode).toBe(code);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long error messages', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new AppError(500, longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10000);
    });

    it('should handle special characters in messages', () => {
      const specialChars =
        'Error: "quotes" and \'apostrophes\' and \n newlines \t tabs';
      const error = new AppError(500, specialChars);

      expect(error.message).toBe(specialChars);
    });

    it('should handle empty message', () => {
      const error = new AppError(500, '');

      expect(error.message).toBe('');
      expect(error.statusCode).toBe(500);
    });

    it('should handle negative status codes', () => {
      const error = new AppError(-1, 'Test');

      expect(error.statusCode).toBe(-1);
    });

    it('should handle very large status codes', () => {
      const error = new AppError(999, 'Test');

      expect(error.statusCode).toBe(999);
    });

    it('should handle zero status code', () => {
      const error = new AppError(0, 'Test');

      expect(error.statusCode).toBe(0);
    });

    it('should handle JSON with circular references', () => {
      const error = new AppError(500, 'Test');
      const circular: any = { error };
      circular.self = circular;

      expect(() => error.toString()).not.toThrow();
    });

    it('should handle unicode characters', () => {
      const unicodeMessage = 'Error: 日本語 العربية 中文';
      const error = new AppError(500, unicodeMessage);

      expect(error.message).toBe(unicodeMessage);
    });

    it('should handle null prototype', () => {
      const error = new AppError(500, 'Test');

      expect(error instanceof Error).toBe(true);
      expect(typeof error.message).toBe('string');
    });
  });
});
