/**
 * Unit tests for fakeDetection barrel exports
 * Ensures re-exports are correctly wired
 */

// Mock Prisma before importing
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    modReport: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    warnedMod: { findUnique: jest.fn(), upsert: jest.fn(), count: jest.fn() },
    bannedCreator: { findUnique: jest.fn(), create: jest.fn() },
  })),
}));

jest.mock('@utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  FakeScoreService,
  fakeScoreService,
  ReportService,
  reportService,
} from '@services/fakeDetection';

describe('fakeDetection barrel exports', () => {
  it('should export FakeScoreService class', () => {
    expect(FakeScoreService).toBeDefined();
    expect(typeof FakeScoreService).toBe('function');
  });

  it('should export fakeScoreService singleton instance', () => {
    expect(fakeScoreService).toBeDefined();
    expect(fakeScoreService).toBeInstanceOf(FakeScoreService);
  });

  it('should export ReportService class', () => {
    expect(ReportService).toBeDefined();
    expect(typeof ReportService).toBe('function');
  });

  it('should export reportService singleton instance', () => {
    expect(reportService).toBeDefined();
    expect(reportService).toBeInstanceOf(ReportService);
  });
});
