/**
 * Unit tests for ReportService
 * Tests report submission, warnings, and creator bans
 */

// Mock Prisma before importing ReportService
const mockModReport = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
};

const mockWarnedMod = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  count: jest.fn(),
};

const mockBannedCreator = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    modReport: mockModReport,
    warnedMod: mockWarnedMod,
    bannedCreator: mockBannedCreator,
  })),
}));

// Mock logger
jest.mock('@utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { ReportService } from '@services/fakeDetection/ReportService';

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportService();
  });

  describe('submitReport', () => {
    const validReport = {
      machineId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'Missing mod files',
      fakeScore: 45,
      creatorId: 1001,
      creatorName: 'Test Creator',
    };

    it('should submit report successfully for new report', async () => {
      mockModReport.findUnique.mockResolvedValue(null);
      mockModReport.create.mockResolvedValue({ id: '1', modId: 123 });
      mockModReport.count.mockResolvedValue(1);

      const result = await service.submitReport(123, validReport);

      expect(result.success).toBe(true);
      expect(result.alreadyReported).toBeUndefined();
      expect(mockModReport.create).toHaveBeenCalled();
    });

    it('should return alreadyReported for duplicate report', async () => {
      mockModReport.findUnique.mockResolvedValue({
        id: '1',
        modId: 123,
        machineId: validReport.machineId,
      });

      const result = await service.submitReport(123, validReport);

      expect(result.success).toBe(false);
      expect(result.alreadyReported).toBe(true);
      expect(mockModReport.create).not.toHaveBeenCalled();
    });

    it('should auto-warn for high fake score (>= 50)', async () => {
      const highScoreReport = { ...validReport, fakeScore: 75 };

      mockModReport.findUnique.mockResolvedValue(null);
      mockModReport.create.mockResolvedValue({ id: '1' });
      mockModReport.count.mockResolvedValue(1);
      mockWarnedMod.upsert.mockResolvedValue({ id: '1' });
      mockWarnedMod.count.mockResolvedValue(1);
      mockBannedCreator.findUnique.mockResolvedValue(null);

      await service.submitReport(123, highScoreReport);

      expect(mockWarnedMod.upsert).toHaveBeenCalled();
    });

    it('should auto-warn when report count reaches threshold', async () => {
      mockModReport.findUnique.mockResolvedValue(null);
      mockModReport.create.mockResolvedValue({ id: '1' });
      mockModReport.count.mockResolvedValue(3); // Threshold is 3
      mockWarnedMod.upsert.mockResolvedValue({ id: '1' });
      mockWarnedMod.count.mockResolvedValue(1);
      mockBannedCreator.findUnique.mockResolvedValue(null);

      await service.submitReport(123, validReport);

      expect(mockWarnedMod.upsert).toHaveBeenCalled();
    });

    it('should not auto-warn when below threshold and low score', async () => {
      const lowScoreReport = { ...validReport, fakeScore: 30 };

      mockModReport.findUnique.mockResolvedValue(null);
      mockModReport.create.mockResolvedValue({ id: '1' });
      mockModReport.count.mockResolvedValue(1); // Below threshold

      await service.submitReport(123, lowScoreReport);

      expect(mockWarnedMod.upsert).not.toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      mockModReport.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.submitReport(123, validReport)).rejects.toThrow('Database error');
    });
  });

  describe('addAutoWarning', () => {
    it('should add auto warning with reason', async () => {
      mockWarnedMod.upsert.mockResolvedValue({ id: '1', modId: 123 });
      mockWarnedMod.count.mockResolvedValue(1);
      mockBannedCreator.findUnique.mockResolvedValue(null);

      await service.addAutoWarning(123, 'No valid mod files', 1001, 'Creator');

      expect(mockWarnedMod.upsert).toHaveBeenCalledWith({
        where: { modId: 123 },
        create: expect.objectContaining({
          modId: 123,
          isAutoWarned: true,
          warningReason: 'No valid mod files',
        }),
        update: expect.objectContaining({
          isAutoWarned: true,
          warningReason: 'No valid mod files',
        }),
      });
    });

    it('should check for creator ban after warning', async () => {
      mockWarnedMod.upsert.mockResolvedValue({ id: '1' });
      mockWarnedMod.count.mockResolvedValue(3); // Threshold for ban
      mockBannedCreator.findUnique.mockResolvedValue(null);
      mockBannedCreator.create.mockResolvedValue({ id: '1' });

      await service.addAutoWarning(123, 'Test', 1001, 'Creator');

      expect(mockBannedCreator.create).toHaveBeenCalled();
    });
  });

  describe('getWarningStatus', () => {
    it('should return warning status for warned mod', async () => {
      mockWarnedMod.findUnique.mockResolvedValue({
        modId: 123,
        reportCount: 5,
        isAutoWarned: true,
        warningReason: 'Missing files',
        creatorId: 1001,
      });
      mockBannedCreator.findUnique.mockResolvedValue(null);

      const result = await service.getWarningStatus(123);

      expect(result.hasWarning).toBe(true);
      expect(result.reportCount).toBe(5);
      expect(result.isAutoWarned).toBe(true);
      expect(result.warningReason).toBe('Missing files');
      expect(result.creatorBanned).toBe(false);
    });

    it('should return clean status for unwarned mod', async () => {
      mockWarnedMod.findUnique.mockResolvedValue(null);

      const result = await service.getWarningStatus(123);

      expect(result.hasWarning).toBe(false);
      expect(result.reportCount).toBe(0);
      expect(result.isAutoWarned).toBe(false);
      expect(result.creatorBanned).toBe(false);
    });

    it('should check creator ban status from warning', async () => {
      mockWarnedMod.findUnique.mockResolvedValue({
        modId: 123,
        reportCount: 3,
        isAutoWarned: false,
        creatorId: 1001,
      });
      mockBannedCreator.findUnique.mockResolvedValue({
        creatorId: 1001,
        modsBannedCount: 5,
      });

      const result = await service.getWarningStatus(123);

      expect(result.creatorBanned).toBe(true);
    });

    it('should check creator ban status from parameter', async () => {
      mockWarnedMod.findUnique.mockResolvedValue(null);
      mockBannedCreator.findUnique.mockResolvedValue({
        creatorId: 1001,
        modsBannedCount: 5,
      });

      const result = await service.getWarningStatus(123, 1001);

      expect(result.creatorBanned).toBe(true);
    });

    it('should throw error on database failure', async () => {
      mockWarnedMod.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.getWarningStatus(123)).rejects.toThrow('DB error');
    });
  });

  describe('getBatchWarningStatus', () => {
    it('should return warning status for multiple mods', async () => {
      mockWarnedMod.findMany.mockResolvedValue([
        { modId: 1, reportCount: 3, isAutoWarned: true, creatorId: 1001 },
        { modId: 3, reportCount: 1, isAutoWarned: false, creatorId: null },
      ]);
      mockBannedCreator.findMany.mockResolvedValue([]);

      const result = await service.getBatchWarningStatus([1, 2, 3]);

      expect(result[1].hasWarning).toBe(true);
      expect(result[1].reportCount).toBe(3);
      expect(result[2].hasWarning).toBe(false);
      expect(result[3].hasWarning).toBe(true);
    });

    it('should check creator bans for all mods', async () => {
      mockWarnedMod.findMany.mockResolvedValue([
        { modId: 1, reportCount: 3, isAutoWarned: true, creatorId: 1001 },
      ]);
      mockBannedCreator.findMany.mockResolvedValue([
        { creatorId: 1001, modsBannedCount: 5 },
      ]);

      const result = await service.getBatchWarningStatus([1, 2], [1001, 1001]);

      expect(result[1].creatorBanned).toBe(true);
      expect(result[2].creatorBanned).toBe(true); // Same creator
    });

    it('should handle empty mod list', async () => {
      mockWarnedMod.findMany.mockResolvedValue([]);
      mockBannedCreator.findMany.mockResolvedValue([]);

      const result = await service.getBatchWarningStatus([]);

      expect(result).toEqual({});
    });

    it('should throw error on database failure', async () => {
      mockWarnedMod.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.getBatchWarningStatus([1, 2, 3])).rejects.toThrow('DB error');
    });
  });

  describe('isCreatorBanned', () => {
    it('should return banned status for banned creator', async () => {
      mockBannedCreator.findUnique.mockResolvedValue({
        creatorId: 1001,
        modsBannedCount: 5,
      });

      const result = await service.isCreatorBanned(1001);

      expect(result.banned).toBe(true);
      expect(result.reason).toContain('5 mods');
      expect(result.modsBannedCount).toBe(5);
    });

    it('should return not banned for clean creator', async () => {
      mockBannedCreator.findUnique.mockResolvedValue(null);

      const result = await service.isCreatorBanned(1001);

      expect(result.banned).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.modsBannedCount).toBeUndefined();
    });

    it('should throw error on database failure', async () => {
      mockBannedCreator.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.isCreatorBanned(1001)).rejects.toThrow('DB error');
    });
  });

  describe('getCreatorFakeRatio', () => {
    it('should calculate ratio correctly', async () => {
      mockWarnedMod.count.mockResolvedValue(2);

      const result = await service.getCreatorFakeRatio(1001, 10);

      expect(result).toBe(0.2);
    });

    it('should return 0 for creator with no warnings', async () => {
      mockWarnedMod.count.mockResolvedValue(0);

      const result = await service.getCreatorFakeRatio(1001, 10);

      expect(result).toBe(0);
    });

    it('should cap ratio at 1', async () => {
      mockWarnedMod.count.mockResolvedValue(15);

      const result = await service.getCreatorFakeRatio(1001, 10);

      expect(result).toBe(1);
    });

    it('should return 0 for zero total mods', async () => {
      mockWarnedMod.count.mockResolvedValue(5);

      const result = await service.getCreatorFakeRatio(1001, 0);

      expect(result).toBe(0);
    });

    it('should use default total mods if not provided', async () => {
      mockWarnedMod.count.mockResolvedValue(5);

      const result = await service.getCreatorFakeRatio(1001);

      expect(result).toBe(0.5); // 5/10 default
    });

    it('should return 0 on database error', async () => {
      mockWarnedMod.count.mockRejectedValue(new Error('DB error'));

      const result = await service.getCreatorFakeRatio(1001, 10);

      expect(result).toBe(0);
    });
  });

  describe('getReportCount', () => {
    it('should return report count', async () => {
      mockModReport.count.mockResolvedValue(5);

      const result = await service.getReportCount(123);

      expect(result).toBe(5);
      expect(mockModReport.count).toHaveBeenCalledWith({ where: { modId: 123 } });
    });
  });

  describe('hasAlreadyReported', () => {
    it('should return true if already reported', async () => {
      mockModReport.findUnique.mockResolvedValue({ id: '1' });

      const result = await service.hasAlreadyReported(123, 'machine-id');

      expect(result).toBe(true);
    });

    it('should return false if not reported', async () => {
      mockModReport.findUnique.mockResolvedValue(null);

      const result = await service.hasAlreadyReported(123, 'machine-id');

      expect(result).toBe(false);
    });
  });
});
