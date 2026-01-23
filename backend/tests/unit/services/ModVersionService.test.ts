/**
 * Unit tests for ModVersionService
 * Tests batch version fetching and update detection
 */

import { ModVersionService } from '@services/curseforge/ModVersionService';
import { CurseForgeClient } from 'curseforge-api';

jest.mock('curseforge-api');

describe('ModVersionService', () => {
  let service: ModVersionService;
  const mockApiKey = 'test-api-key';
  const mockGetMod = (CurseForgeClient as any).mockGetMod;

  beforeEach(() => {
    jest.clearAllMocks();
    (CurseForgeClient as any).mockReset?.();
    service = new ModVersionService();
  });

  describe('getLatestVersions', () => {
    const createMockMod = (id: number, fileId: number = 111) => ({
      id,
      name: `Test Mod ${id}`,
      latestFiles: [
        {
          id: fileId,
          fileName: `mod-${id}-v1.0.zip`,
          displayName: `Mod ${id} v1.0`,
          fileDate: new Date('2024-01-15'),
          fileLength: 12345,
        },
      ],
    });

    it('should return empty object for empty mod list', async () => {
      const result = await service.getLatestVersions(mockApiKey, []);
      expect(result).toEqual({});
      expect(CurseForgeClient).not.toHaveBeenCalled();
    });

    it('should fetch version info for single mod', async () => {
      mockGetMod.mockResolvedValue(createMockMod(123, 111));

      const result = await service.getLatestVersions(mockApiKey, [123]);

      expect(result[123]).toBeDefined();
      expect(result[123].modId).toBe(123);
      expect(result[123].latestFileId).toBe(111);
      expect(result[123].latestFileName).toBe('mod-123-v1.0.zip');
    });

    it('should fetch version info for multiple mods', async () => {
      mockGetMod
        .mockResolvedValueOnce(createMockMod(1, 100))
        .mockResolvedValueOnce(createMockMod(2, 200))
        .mockResolvedValueOnce(createMockMod(3, 300));

      const result = await service.getLatestVersions(mockApiKey, [1, 2, 3]);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result[1].latestFileId).toBe(100);
      expect(result[2].latestFileId).toBe(200);
      expect(result[3].latestFileId).toBe(300);
    });

    it('should deduplicate mod IDs', async () => {
      mockGetMod.mockResolvedValue(createMockMod(123, 111));

      const result = await service.getLatestVersions(mockApiKey, [123, 123, 123]);

      expect(mockGetMod).toHaveBeenCalledTimes(1);
      expect(result[123]).toBeDefined();
    });

    it('should handle mod fetch failure gracefully', async () => {
      mockGetMod
        .mockResolvedValueOnce(createMockMod(1, 100))
        .mockRejectedValueOnce(new Error('Mod not found'))
        .mockResolvedValueOnce(createMockMod(3, 300));

      const result = await service.getLatestVersions(mockApiKey, [1, 2, 3]);

      // Should still return results for successful fetches
      expect(result[1]).toBeDefined();
      expect(result[2]).toBeUndefined();
      expect(result[3]).toBeDefined();
    });

    it('should skip mods without latestFiles', async () => {
      mockGetMod.mockResolvedValue({
        id: 123,
        name: 'Empty Mod',
        latestFiles: [],
      });

      const result = await service.getLatestVersions(mockApiKey, [123]);

      expect(result[123]).toBeUndefined();
    });

    it('should skip null mods', async () => {
      mockGetMod.mockResolvedValue(null);

      const result = await service.getLatestVersions(mockApiKey, [123]);

      expect(result[123]).toBeUndefined();
    });

    it('should handle mods without displayName', async () => {
      mockGetMod.mockResolvedValue({
        id: 123,
        latestFiles: [
          {
            id: 111,
            fileName: 'mod.zip',
            fileDate: new Date('2024-01-15'),
            fileLength: 1000,
          },
        ],
      });

      const result = await service.getLatestVersions(mockApiKey, [123]);

      expect(result[123].latestDisplayName).toBe('mod.zip');
    });

    it('should handle mods without fileDate', async () => {
      mockGetMod.mockResolvedValue({
        id: 123,
        latestFiles: [
          {
            id: 111,
            fileName: 'mod.zip',
            fileLength: 1000,
          },
        ],
      });

      const result = await service.getLatestVersions(mockApiKey, [123]);

      expect(result[123].latestFileDate).toBeDefined();
      // Should use current date
      expect(new Date(result[123].latestFileDate).getTime()).toBeGreaterThan(0);
    });

    it('should handle mods without fileLength', async () => {
      mockGetMod.mockResolvedValue({
        id: 123,
        latestFiles: [
          {
            id: 111,
            fileName: 'mod.zip',
            displayName: 'Mod v1.0',
            fileDate: new Date('2024-01-15'),
          },
        ],
      });

      const result = await service.getLatestVersions(mockApiKey, [123]);

      expect(result[123].latestFileSize).toBe(0);
    });

    it('should batch large mod lists', async () => {
      // Create 75 mods (should be split into 2 batches of 50 + 25)
      const modIds = Array.from({ length: 75 }, (_, i) => i + 1);

      modIds.forEach((id) => {
        mockGetMod.mockResolvedValueOnce(createMockMod(id, id * 10));
      });

      const result = await service.getLatestVersions(mockApiKey, modIds);

      expect(Object.keys(result)).toHaveLength(75);
      expect(result[1].latestFileId).toBe(10);
      expect(result[75].latestFileId).toBe(750);
    });

    it('should handle batch error and continue with partial results', async () => {
      // First batch succeeds
      for (let i = 1; i <= 50; i++) {
        mockGetMod.mockResolvedValueOnce(createMockMod(i, i * 10));
      }
      // Second batch - some fail
      for (let i = 51; i <= 60; i++) {
        if (i % 2 === 0) {
          mockGetMod.mockRejectedValueOnce(new Error('Failed'));
        } else {
          mockGetMod.mockResolvedValueOnce(createMockMod(i, i * 10));
        }
      }

      const modIds = Array.from({ length: 60 }, (_, i) => i + 1);
      const result = await service.getLatestVersions(mockApiKey, modIds);

      // Should have results for successful fetches
      expect(result[1]).toBeDefined();
      expect(result[50]).toBeDefined();
    });

    it('should create client with correct API key', async () => {
      mockGetMod.mockResolvedValue(createMockMod(123, 111));

      await service.getLatestVersions(mockApiKey, [123]);

      expect(CurseForgeClient).toHaveBeenCalledWith(mockApiKey);
    });
  });

  describe('hasUpdate', () => {
    const createMockMod = (id: number, fileId: number) => ({
      id,
      name: `Test Mod ${id}`,
      latestFiles: [
        {
          id: fileId,
          fileName: `mod-${id}.zip`,
          displayName: `Mod ${id}`,
          fileDate: new Date('2024-01-15'),
          fileLength: 12345,
        },
      ],
    });

    it('should return true when update is available', async () => {
      mockGetMod.mockResolvedValue(createMockMod(123, 222));

      const result = await service.hasUpdate(mockApiKey, 123, 111);

      expect(result).toBe(true);
    });

    it('should return false when no update available', async () => {
      mockGetMod.mockResolvedValue(createMockMod(123, 111));

      const result = await service.hasUpdate(mockApiKey, 123, 111);

      expect(result).toBe(false);
    });

    it('should return false when mod not found', async () => {
      mockGetMod.mockRejectedValue(new Error('Not found'));

      const result = await service.hasUpdate(mockApiKey, 123, 111);

      expect(result).toBe(false);
    });

    it('should return false when mod has no files', async () => {
      mockGetMod.mockResolvedValue({
        id: 123,
        latestFiles: [],
      });

      const result = await service.hasUpdate(mockApiKey, 123, 111);

      expect(result).toBe(false);
    });
  });
});
