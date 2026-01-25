/**
 * Unit tests for ToolsService
 * Tests tool metadata retrieval and file access
 */

import { ToolsService } from '@services/tools/ToolsService';
import fs from 'fs';

// Mock fs module
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ToolsService', () => {
  let toolsService: ToolsService;

  const mockMetadata = {
    'sims-log-enabler': {
      version: '1.0.0',
      description: 'Enables The Sims 4 logging',
      files: [
        {
          filename: 'test.ts4script',
          hash: 'abc123',
          fileSize: 1234,
        },
        {
          filename: 'config.cfg',
          hash: 'def456',
          fileSize: 100,
        },
      ],
    },
  };

  beforeEach(() => {
    toolsService = new ToolsService();
    toolsService.clearCache();
    jest.clearAllMocks();
  });

  describe('getMetadata', () => {
    it('should return metadata for valid tool', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));

      const result = toolsService.getMetadata('sims-log-enabler');

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(result.files).toHaveLength(2);
    });

    it('should throw NotFoundError for unknown tool', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));

      expect(() => {
        toolsService.getMetadata('unknown-tool' as any);
      }).toThrow('Tool not found: unknown-tool');
    });

    it('should throw NotFoundError when metadata file missing', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        toolsService.getMetadata('sims-log-enabler');
      }).toThrow('Tools metadata file not found');
    });

    it('should cache metadata after first load', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));

      toolsService.getMetadata('sims-log-enabler');
      toolsService.getMetadata('sims-log-enabler');

      expect(mockFs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFileMetadata', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));
    });

    it('should return file metadata for valid file', () => {
      const result = toolsService.getFileMetadata('sims-log-enabler', 'test.ts4script');

      expect(result).toBeDefined();
      expect(result.filename).toBe('test.ts4script');
      expect(result.hash).toBe('abc123');
      expect(result.fileSize).toBe(1234);
    });

    it('should throw NotFoundError for unknown file', () => {
      expect(() => {
        toolsService.getFileMetadata('sims-log-enabler', 'unknown.file');
      }).toThrow('File not found in tool sims-log-enabler: unknown.file');
    });
  });

  describe('getFilePath', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));
    });

    it('should return file path when file exists', () => {
      const result = toolsService.getFilePath('sims-log-enabler', 'test.ts4script');

      expect(result).toContain('sims-log-enabler');
      expect(result).toContain('test.ts4script');
    });

    it('should throw NotFoundError when file not on disk', () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // metadata file exists
        .mockReturnValueOnce(false); // tool file doesn't exist

      expect(() => {
        toolsService.getFilePath('sims-log-enabler', 'test.ts4script');
      }).toThrow('Tool file not found on disk: test.ts4script');
    });
  });

  describe('getFileList', () => {
    it('should return list of filenames', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));

      const result = toolsService.getFileList('sims-log-enabler');

      expect(result).toEqual(['test.ts4script', 'config.cfg']);
    });
  });

  describe('toolExists', () => {
    it('should return true when tool and all files exist', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));

      const result = toolsService.toolExists('sims-log-enabler');

      expect(result).toBe(true);
    });

    it('should return false when tool metadata missing', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = toolsService.toolExists('sims-log-enabler');

      expect(result).toBe(false);
    });

    it('should return false when a file is missing', () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // metadata exists
        .mockReturnValueOnce(true) // first file exists
        .mockReturnValueOnce(false); // second file missing
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));

      const result = toolsService.toolExists('sims-log-enabler');

      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cached metadata', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));

      toolsService.getMetadata('sims-log-enabler');
      toolsService.clearCache();
      toolsService.getMetadata('sims-log-enabler');

      expect(mockFs.readFileSync).toHaveBeenCalledTimes(2);
    });
  });
});
