/**
 * Global test setup file
 * Runs before all tests
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env' });

// Set test mode
process.env.NODE_ENV = 'test';

// Mock console methods in tests if needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set longer timeout for integration tests
jest.setTimeout(10000);
