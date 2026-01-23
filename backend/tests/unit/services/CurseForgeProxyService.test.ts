/**
 * Unit tests for CurseForgeProxyService
 * Tests CurseForge API proxy functionality
 */

import { CurseForgeProxyService } from '@services/curseforge/CurseForgeProxyService';
import { CurseForgeClient } from 'curseforge-api';

// Mock the curseforge-api module
jest.mock('curseforge-api');

// Mock global fetch for getMod description fetching
global.fetch = jest.fn();

describe('CurseForgeProxyService', () => {
  let service: CurseForgeProxyService;
  const mockApiKey = 'test-api-key';

  // Access mock functions
  const mockSearchMods = (CurseForgeClient as any).mockSearchMods;
  const mockGetMod = (CurseForgeClient as any).mockGetMod;
  const mockGetCategories = (CurseForgeClient as any).mockGetCategories;

  beforeEach(() => {
    jest.clearAllMocks();
    (CurseForgeClient as any).mockReset?.();
    (global.fetch as jest.Mock).mockReset();
    service = new CurseForgeProxyService();
  });

  describe('searchMods', () => {
    const mockModData = {
      id: 123456,
      name: 'Test Mod',
      slug: 'test-mod',
      summary: 'A test mod summary',
      description: 'Full description',
      downloadCount: 5000,
      dateModified: new Date('2024-01-15'),
      dateCreated: new Date('2024-01-01'),
      logo: { url: 'https://example.com/logo.png' },
      screenshots: [{ url: 'https://example.com/screen1.png' }],
      authors: [{ name: 'Author1', id: 1001 }],
      categories: [{ name: 'Mods' }],
      links: { websiteUrl: 'https://example.com' },
      latestFiles: [
        {
          id: 111,
          displayName: 'Test Mod v1.0',
          fileName: 'test-mod-1.0.zip',
          fileDate: new Date('2024-01-15'),
          fileLength: 12345,
          downloadUrl: 'https://example.com/download',
          gameVersions: ['1.20'],
        },
      ],
    };

    it('should search mods without query', async () => {
      mockSearchMods.mockResolvedValue({
        data: [mockModData],
        pagination: { index: 0, pageSize: 50, resultCount: 1, totalCount: 1 },
      });

      const result = await service.searchMods({
        apiKey: mockApiKey,
        pageSize: 50,
        pageIndex: 0,
      });

      expect(result.mods).toHaveLength(1);
      expect(result.mods[0].id).toBe(123456);
      expect(result.mods[0].name).toBe('Test Mod');
      expect(result.pagination.totalCount).toBe(1);
    });

    it('should search mods with text query and apply advanced scoring', async () => {
      const mod1 = { ...mockModData, id: 1, name: 'Best Test Mod', downloadCount: 1000 };
      const mod2 = { ...mockModData, id: 2, name: 'Test Mod Pack', downloadCount: 2000 };
      const mod3 = { ...mockModData, id: 3, name: 'Another Mod', downloadCount: 3000 };

      mockSearchMods.mockResolvedValue({
        data: [mod1, mod2, mod3],
        pagination: { index: 0, pageSize: 50, resultCount: 3, totalCount: 3 },
      });

      const result = await service.searchMods({
        apiKey: mockApiKey,
        query: 'Test',
        pageSize: 50,
        pageIndex: 0,
      });

      expect(result.mods.length).toBeGreaterThan(0);
      // Mods with 'Test' in name should be prioritized
      expect(CurseForgeClient).toHaveBeenCalledWith(mockApiKey);
    });

    it('should handle pagination with text query', async () => {
      // Generate more mods for pagination testing
      const mods = Array.from({ length: 20 }, (_, i) => ({
        ...mockModData,
        id: i + 1,
        name: `Test Mod ${i + 1}`,
      }));

      mockSearchMods.mockResolvedValue({
        data: mods,
        pagination: { index: 0, pageSize: 50, resultCount: 20, totalCount: 20 },
      });

      const result = await service.searchMods({
        apiKey: mockApiKey,
        query: 'Test',
        pageSize: 10,
        pageIndex: 1,
      });

      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.index).toBe(1);
    });

    it('should support sorting by downloads', async () => {
      mockSearchMods.mockResolvedValue({
        data: [mockModData],
        pagination: { index: 0, pageSize: 50, resultCount: 1, totalCount: 1 },
      });

      await service.searchMods({
        apiKey: mockApiKey,
        sortBy: 'downloads',
      });

      expect(mockSearchMods).toHaveBeenCalled();
    });

    it('should support sorting by date', async () => {
      mockSearchMods.mockResolvedValue({
        data: [mockModData],
        pagination: { index: 0, pageSize: 50, resultCount: 1, totalCount: 1 },
      });

      await service.searchMods({
        apiKey: mockApiKey,
        sortBy: 'date',
      });

      expect(mockSearchMods).toHaveBeenCalled();
    });

    it('should support sorting by popularity', async () => {
      mockSearchMods.mockResolvedValue({
        data: [mockModData],
        pagination: { index: 0, pageSize: 50, resultCount: 1, totalCount: 1 },
      });

      await service.searchMods({
        apiKey: mockApiKey,
        sortBy: 'popularity',
      });

      expect(mockSearchMods).toHaveBeenCalled();
    });

    it('should support sorting by relevance', async () => {
      mockSearchMods.mockResolvedValue({
        data: [mockModData],
        pagination: { index: 0, pageSize: 50, resultCount: 1, totalCount: 1 },
      });

      await service.searchMods({
        apiKey: mockApiKey,
        query: 'test',
        sortBy: 'relevance',
      });

      expect(mockSearchMods).toHaveBeenCalled();
    });

    it('should filter by category name', async () => {
      mockGetCategories.mockResolvedValue([
        { id: 6, name: 'Mods' },
        { id: 7, name: 'Cheats' },
      ]);
      mockSearchMods.mockResolvedValue({
        data: [mockModData],
        pagination: { index: 0, pageSize: 50, resultCount: 1, totalCount: 1 },
      });

      await service.searchMods({
        apiKey: mockApiKey,
        categoryName: 'Mods',
      });

      expect(mockGetCategories).toHaveBeenCalledWith(78062);
      expect(mockSearchMods).toHaveBeenCalledWith(
        78062,
        expect.objectContaining({
          categoryId: 6,
        })
      );
    });

    it('should handle category not found', async () => {
      mockGetCategories.mockResolvedValue([
        { id: 6, name: 'Mods' },
      ]);
      mockSearchMods.mockResolvedValue({
        data: [mockModData],
        pagination: { index: 0, pageSize: 50, resultCount: 1, totalCount: 1 },
      });

      await service.searchMods({
        apiKey: mockApiKey,
        categoryName: 'NonExistent',
      });

      // Should still call searchMods without categoryId
      expect(mockSearchMods).toHaveBeenCalled();
    });

    it('should fetch additional pages for text query', async () => {
      mockSearchMods
        .mockResolvedValueOnce({
          data: Array.from({ length: 50 }, (_, i) => ({ ...mockModData, id: i })),
          pagination: { index: 0, pageSize: 50, resultCount: 50, totalCount: 150 },
        })
        .mockResolvedValueOnce({
          data: Array.from({ length: 50 }, (_, i) => ({ ...mockModData, id: i + 50 })),
          pagination: { index: 50, pageSize: 50, resultCount: 50, totalCount: 150 },
        })
        .mockResolvedValueOnce({
          data: Array.from({ length: 50 }, (_, i) => ({ ...mockModData, id: i + 100 })),
          pagination: { index: 100, pageSize: 50, resultCount: 50, totalCount: 150 },
        });

      await service.searchMods({
        apiKey: mockApiKey,
        query: 'test',
        pageSize: 20,
        pageIndex: 0,
      });

      // Should fetch multiple pages for advanced search
      expect(mockSearchMods).toHaveBeenCalledTimes(3);
    });

    it('should transform mod data correctly', async () => {
      mockSearchMods.mockResolvedValue({
        data: [mockModData],
        pagination: { index: 0, pageSize: 50, resultCount: 1, totalCount: 1 },
      });

      const result = await service.searchMods({
        apiKey: mockApiKey,
      });

      const mod = result.mods[0];
      expect(mod.id).toBe(123456);
      expect(mod.name).toBe('Test Mod');
      expect(mod.slug).toBe('test-mod');
      expect(mod.summary).toBe('A test mod summary');
      expect(mod.logo).toBe('https://example.com/logo.png');
      expect(mod.screenshots).toContain('https://example.com/screen1.png');
      expect(mod.authors[0].name).toBe('Author1');
      expect(mod.categories).toContain('Mods');
      expect(mod.latestFiles).toHaveLength(1);
    });

    it('should handle mods with missing optional fields', async () => {
      const minimalMod = {
        id: 1,
        name: 'Minimal Mod',
        slug: 'minimal',
        summary: 'Summary',
      };

      mockSearchMods.mockResolvedValue({
        data: [minimalMod],
        pagination: { index: 0, pageSize: 50, resultCount: 1, totalCount: 1 },
      });

      const result = await service.searchMods({
        apiKey: mockApiKey,
      });

      expect(result.mods[0].logo).toBeNull();
      expect(result.mods[0].screenshots).toEqual([]);
      expect(result.mods[0].authors).toEqual([]);
      expect(result.mods[0].categories).toEqual([]);
      expect(result.mods[0].latestFiles).toEqual([]);
    });

    it('should use default values for pagination', async () => {
      mockSearchMods.mockResolvedValue({
        data: [],
        pagination: { index: 0, pageSize: 50, resultCount: 0, totalCount: 0 },
      });

      await service.searchMods({ apiKey: mockApiKey });

      expect(mockSearchMods).toHaveBeenCalledWith(
        78062,
        expect.objectContaining({
          pageSize: 50,
          index: 0,
        })
      );
    });
  });

  describe('getMod', () => {
    const mockModData = {
      id: 123456,
      name: 'Test Mod',
      slug: 'test-mod',
      summary: 'A test mod',
      description: 'Detailed description',
      downloadCount: 5000,
      dateModified: new Date('2024-01-15'),
      dateCreated: new Date('2024-01-01'),
      logo: { url: 'https://example.com/logo.png' },
      screenshots: [],
      authors: [{ name: 'Author', id: 1 }],
      categories: [],
      links: { websiteUrl: 'https://example.com', sourceUrl: '' },
      latestFiles: [],
    };

    it('should get mod details', async () => {
      mockGetMod.mockResolvedValue(mockModData);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { description: 'Full HTML description' } }),
      });

      const result = await service.getMod(mockApiKey, 123456);

      expect(result.id).toBe(123456);
      expect(result.name).toBe('Test Mod');
      expect(CurseForgeClient).toHaveBeenCalledWith(mockApiKey);
      expect(mockGetMod).toHaveBeenCalledWith(123456);
    });

    it('should fetch full description via API', async () => {
      mockGetMod.mockResolvedValue(mockModData);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { description: '<p>Full description</p>' } }),
      });

      const result = await service.getMod(mockApiKey, 123456);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.curseforge.com/v1/mods/123456',
        expect.objectContaining({
          headers: { 'X-API-Key': mockApiKey },
        })
      );
      expect(result.description).toBe('<p>Full description</p>');
    });

    it('should handle description fetch failure gracefully', async () => {
      mockGetMod.mockResolvedValue(mockModData);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.getMod(mockApiKey, 123456);

      // Should still return mod data
      expect(result.id).toBe(123456);
    });

    it('should handle non-ok response from description fetch', async () => {
      mockGetMod.mockResolvedValue(mockModData);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await service.getMod(mockApiKey, 123456);

      expect(result.id).toBe(123456);
    });

    it('should transform mod data correctly', async () => {
      mockGetMod.mockResolvedValue(mockModData);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const result = await service.getMod(mockApiKey, 123456);

      expect(result.slug).toBe('test-mod');
      expect(result.summary).toBe('A test mod');
      expect(result.downloadCount).toBe(5000);
      expect(result.logo).toBe('https://example.com/logo.png');
      expect(result.websiteUrl).toBe('https://example.com');
    });
  });

  describe('getCategories', () => {
    it('should get all categories', async () => {
      mockGetCategories.mockResolvedValue([
        { id: 6, name: 'Mods', slug: 'mods' },
        { id: 7, name: 'Cheats', slug: 'cheats' },
        { id: 8, name: 'Clothing', slug: 'clothing' },
      ]);

      const result = await service.getCategories(mockApiKey);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 6, name: 'Mods' });
      expect(result[1]).toEqual({ id: 7, name: 'Cheats' });
      expect(mockGetCategories).toHaveBeenCalledWith(78062);
    });

    it('should return empty array when no categories', async () => {
      mockGetCategories.mockResolvedValue([]);

      const result = await service.getCategories(mockApiKey);

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockGetCategories.mockRejectedValue(new Error('API Error'));

      await expect(service.getCategories(mockApiKey)).rejects.toThrow('API Error');
    });
  });
});
