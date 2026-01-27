/**
 * Integration tests for ReportController
 * Tests HTTP endpoints for fake mod reporting and warnings
 */

import { Request, Response } from 'express';
import { ReportController } from '@controllers/ReportController';
import { reportService } from '@services/fakeDetection/ReportService';
import { TEST_IDS } from '../fixtures/testData';

jest.mock('@services/fakeDetection/ReportService');

describe('ReportController Integration Tests', () => {
  let controller: ReportController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReportController();

    responseJson = jest.fn().mockReturnValue(undefined);
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      params: {},
      body: {},
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };
  });

  describe('submitReport', () => {
    it('should submit report successfully', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.body = {
        machineId: TEST_IDS.MACHINE_ID_1,
        reason: 'Missing mod files',
        fakeScore: 65,
      };

      (reportService.submitReport as jest.Mock).mockResolvedValue({
        success: true,
        alreadyReported: false,
      });

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalled();
    });

    it('should return 400 for invalid mod ID format', async () => {
      mockRequest.params = { modId: 'invalid' };
      mockRequest.body = {
        machineId: TEST_IDS.MACHINE_ID_1,
        reason: 'Test',
        fakeScore: 50,
      };

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for negative mod ID', async () => {
      mockRequest.params = { modId: '-1' };
      mockRequest.body = {
        machineId: TEST_IDS.MACHINE_ID_1,
        reason: 'Test',
        fakeScore: 50,
      };

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid UUID machineId', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.body = {
        machineId: 'not-a-uuid',
        reason: 'Test',
        fakeScore: 50,
      };

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid fakeScore (> 100)', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.body = {
        machineId: TEST_IDS.MACHINE_ID_1,
        reason: 'Test',
        fakeScore: 150,
      };

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid fakeScore (< 0)', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.body = {
        machineId: TEST_IDS.MACHINE_ID_1,
        reason: 'Test',
        fakeScore: -10,
      };

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 409 for duplicate report', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.body = {
        machineId: TEST_IDS.MACHINE_ID_1,
        reason: 'Duplicate',
        fakeScore: 50,
      };

      (reportService.submitReport as jest.Mock).mockResolvedValue({
        success: false,
        alreadyReported: true,
      });

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(409);
    });

    it('should return 400 for missing machineId', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.body = {
        reason: 'Test',
        fakeScore: 50,
      };

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing reason', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.body = {
        machineId: TEST_IDS.MACHINE_ID_1,
        fakeScore: 50,
      };

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing fakeScore', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.body = {
        machineId: TEST_IDS.MACHINE_ID_1,
        reason: 'Test',
      };

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should accept optional creatorId and creatorName', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.body = {
        machineId: TEST_IDS.MACHINE_ID_1,
        reason: 'Test with creator info',
        fakeScore: 70,
        creatorId: TEST_IDS.CREATOR_ID_1,
        creatorName: 'Test Creator',
      };

      (reportService.submitReport as jest.Mock).mockResolvedValue({
        success: true,
        alreadyReported: false,
      });

      await controller.submitReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(reportService.submitReport).toHaveBeenCalled();
    });
  });

  describe('getWarningStatus', () => {
    it('should return warning status for mod', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };

      (reportService.getWarningStatus as jest.Mock).mockResolvedValue({
        hasWarning: true,
        reportCount: 3,
        isAutoWarned: true,
        creatorBanned: false,
      });

      await controller.getWarningStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalled();
    });

    it('should return warning status for clean mod', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };

      (reportService.getWarningStatus as jest.Mock).mockResolvedValue({
        hasWarning: false,
        reportCount: 0,
        isAutoWarned: false,
      });

      await controller.getWarningStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalled();
    });

    it('should handle invalid mod ID', async () => {
      mockRequest.params = { modId: 'invalid' };

      await controller.getWarningStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should include creator ban status', async () => {
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };
      mockRequest.query = { creatorId: String(TEST_IDS.CREATOR_ID_1) };

      (reportService.getWarningStatus as jest.Mock).mockResolvedValue({
        hasWarning: true,
        reportCount: 3,
        creatorBanned: true,
      });

      await controller.getWarningStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalled();
    });
  });

  describe('getBatchWarnings', () => {
    it('should get warning status for multiple mods', async () => {
      mockRequest.body = {
        modIds: [TEST_IDS.MOD_ID_1, TEST_IDS.MOD_ID_2],
      };

      (reportService.getBatchWarningStatus as jest.Mock).mockResolvedValue([
        { modId: TEST_IDS.MOD_ID_1, hasWarning: true },
        { modId: TEST_IDS.MOD_ID_2, hasWarning: false },
      ]);

      await controller.getBatchWarnings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalled();
    });

    it('should return 400 for too many mods', async () => {
      const tooManyMods = Array.from(
        { length: 101 },
        (_, i) => TEST_IDS.MOD_ID_1 + i
      );
      mockRequest.body = { modIds: tooManyMods };

      await controller.getBatchWarnings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for empty modIds', async () => {
      mockRequest.body = { modIds: [] };

      await controller.getBatchWarnings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should accept optional creatorIds', async () => {
      mockRequest.body = {
        modIds: [TEST_IDS.MOD_ID_1],
        creatorIds: [TEST_IDS.CREATOR_ID_1],
      };

      (reportService.getBatchWarningStatus as jest.Mock).mockResolvedValue([]);

      await controller.getBatchWarnings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(reportService.getBatchWarningStatus).toHaveBeenCalled();
    });
  });

  describe('getCreatorBanStatus', () => {
    it('should return ban status for creator', async () => {
      mockRequest.params = { id: String(TEST_IDS.CREATOR_ID_1) };

      (reportService.isCreatorBanned as jest.Mock).mockResolvedValue({
        banned: true,
        modsBannedCount: 3,
      });

      await controller.getCreatorBanStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalled();
    });

    it('should return not banned for clean creator', async () => {
      mockRequest.params = { id: String(TEST_IDS.CREATOR_ID_1) };

      (reportService.isCreatorBanned as jest.Mock).mockResolvedValue({
        banned: false,
      });

      await controller.getCreatorBanStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalled();
    });

    it('should handle invalid creator ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await controller.getCreatorBanStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should handle negative creator ID', async () => {
      mockRequest.params = { id: '-1' };

      await controller.getCreatorBanStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });
  });
});
