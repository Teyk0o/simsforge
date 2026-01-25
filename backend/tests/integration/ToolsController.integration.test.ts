/**
 * Integration tests for ToolsController
 * Tests HTTP endpoints for tool distribution
 */

import { Request, Response } from 'express';
import { ToolsController } from '@controllers/ToolsController';
import { toolsService } from '@services/tools/ToolsService';
import { Readable } from 'stream';

jest.mock('@services/tools/ToolsService');

describe('ToolsController Integration Tests', () => {
  let controller: ToolsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;
  let responseSetHeader: jest.Mock;
  let responsePipe: jest.Mock;

  const mockMetadata = {
    version: '1.0.0',
    description: 'Test tool',
    files: [
      { filename: 'test.ts4script', hash: 'abc123', fileSize: 1234 },
      { filename: 'config.cfg', hash: 'def456', fileSize: 100 },
    ],
  };

  const mockFileMetadata = {
    filename: 'test.ts4script',
    hash: 'abc123',
    fileSize: 1234,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ToolsController();

    responseJson = jest.fn().mockReturnValue(undefined);
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });
    responseSetHeader = jest.fn();
    responsePipe = jest.fn();

    mockRequest = {
      params: {},
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
      setHeader: responseSetHeader,
      pipe: responsePipe,
    };
  });

  describe('getMetadata', () => {
    it('should return metadata for valid tool', async () => {
      mockRequest.params = { toolId: 'sims-log-enabler' };
      (toolsService.getMetadata as jest.Mock).mockReturnValue(mockMetadata);

      await controller.getMetadata(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockMetadata,
      });
    });

    it('should throw error for invalid tool ID', async () => {
      mockRequest.params = { toolId: 'invalid-tool' };

      await expect(
        controller.getMetadata(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow();
    });
  });

  describe('listFiles', () => {
    it('should return list of files for valid tool', async () => {
      mockRequest.params = { toolId: 'sims-log-enabler' };
      (toolsService.getFileList as jest.Mock).mockReturnValue([
        'test.ts4script',
        'config.cfg',
      ]);

      await controller.listFiles(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: { files: ['test.ts4script', 'config.cfg'] },
      });
    });
  });

  describe('downloadFile', () => {
    it('should stream file with correct headers', async () => {
      mockRequest.params = {
        toolId: 'sims-log-enabler',
        filename: 'test.ts4script',
      };

      const mockStream = new Readable({
        read() {
          this.push('test content');
          this.push(null);
        },
      });
      mockStream.pipe = jest.fn();

      (toolsService.getFileMetadata as jest.Mock).mockReturnValue(mockFileMetadata);
      (toolsService.getFileStream as jest.Mock).mockReturnValue(mockStream);

      await controller.downloadFile(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseSetHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream'
      );
      expect(responseSetHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="test.ts4script"'
      );
      expect(responseSetHeader).toHaveBeenCalledWith('X-File-Hash', 'abc123');
      expect(responseSetHeader).toHaveBeenCalledWith('Content-Length', 1234);
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });

    it('should throw error for invalid tool ID', async () => {
      mockRequest.params = {
        toolId: 'invalid-tool',
        filename: 'test.ts4script',
      };

      await expect(
        controller.downloadFile(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow();
    });
  });
});
