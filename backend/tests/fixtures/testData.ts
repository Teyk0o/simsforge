/**
 * Test data factories and fixtures
 */

import { randomUUID } from 'crypto';

/**
 * Factory for creating test mod objects
 */
export const createTestMod = (overrides = {}) => ({
  id: 123456,
  name: 'Test Mod',
  summary: 'A test mod',
  description: 'Detailed description',
  downloadCount: 5000,
  authors: [
    {
      id: 1001,
      name: 'Test Author',
    },
  ],
  links: {
    websiteUrl: 'https://example.com',
  },
  gameVersionLatestFiles: [
    {
      gameVersion: '1.20',
      projectFileId: 111,
      projectFileName: 'test-mod.jar',
    },
  ],
  isAvailable: true,
  ...overrides,
});

/**
 * Factory for creating test report submissions
 */
export const createTestReport = (overrides = {}) => ({
  machineId: randomUUID(),
  reason: 'Missing mod files',
  fakeScore: 65,
  creatorId: 1001,
  creatorName: 'Test Author',
  ...overrides,
});

/**
 * Factory for creating test search requests
 */
export const createTestSearchRequest = (overrides = {}) => ({
  query: 'test mod',
  pageSize: 50,
  pageIndex: 0,
  sortBy: 'downloads',
  categoryName: undefined,
  ...overrides,
});

/**
 * Factory for creating test machine IDs
 */
export const createTestMachineId = (): string => randomUUID();

/**
 * Common test UUIDs for consistent testing
 */
export const TEST_IDS = {
  MOD_ID_1: 123456,
  MOD_ID_2: 123457,
  MOD_ID_3: 123458,
  CREATOR_ID_1: 1001,
  CREATOR_ID_2: 1002,
  MACHINE_ID_1: '550e8400-e29b-41d4-a716-446655440000',
  MACHINE_ID_2: '550e8400-e29b-41d4-a716-446655440001',
  REPORT_ID_1: 'report-uuid-1',
  WARNED_MOD_ID_1: 'warned-uuid-1',
  BANNED_CREATOR_ID_1: 'banned-uuid-1',
};

/**
 * Common test API keys
 */
export const TEST_API_KEYS = {
  VALID: 'test-api-key-valid',
  INVALID: 'test-api-key-invalid',
};

/**
 * Common pagination test data
 */
export const TEST_PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 50,
  INVALID_PAGE_SIZE: 100,
};
