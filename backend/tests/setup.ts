/**
 * Jest test setup file.
 * Runs before all test suites.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
process.env.DATABASE_NAME = 'simsforge_test';

// Increase test timeout for database operations
jest.setTimeout(10000);
