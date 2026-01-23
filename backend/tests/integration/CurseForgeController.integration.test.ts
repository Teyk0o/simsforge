/**
 * Integration tests for CurseForgeController
 * Tests HTTP endpoints for CurseForge API proxy
 */

import { Request, Response } from 'express';
import { CurseForgeController } from '@controllers/CurseForgeController';
import { curseForgeProxyService } from '@services/curseforge/CurseForgeProxyService';
import { modVersionService } from '@services/curseforge/ModVersionService';
import { TEST_API_KEYS, TEST_IDS } from '../fixtures/testData';

jest.mock('@services/curseforge/CurseForgeProxyService');
jest.mock('@services/curseforge/ModVersionService');

describe('CurseForgeController Integration Tests', () => {
  let controller: CurseForgeController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CurseForgeController();

    responseJson = jest.fn().mockReturnValue(undefined);
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      params: {},
      query: {},
      headers: {},
      body: {},
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };
  });

  describe('searchMods', () => {
    it('should search mods with valid query', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.query = {
        query: 'test mod',
        pageSize: '50',
        pageIndex: '0',
      };

      (curseForgeProxyService.searchMods as jest.Mock).mockResolvedValue({
        data: [],
        pagination: {
          index: 0,
          pageSize: 50,
          resultCount: 0,
          totalCount: 0,
        },
      });

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });

    it('should return 403 if API key missing', async () => {
      mockRequest.headers = {};
      mockRequest.query = { query: 'test' };

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'API_KEY_REQUIRED',
          }),
        })
      );
    });

    it('should return 400 for invalid pageSize (> 50)', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.query = {
        query: 'test',
        pageSize: '100',
      };

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid pageSize (< 1)', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.query = {
        query: 'test',
        pageSize: '0',
      };

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid pageIndex (negative)', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.query = {
        query: 'test',
        pageIndex: '-1',
      };

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid sortBy', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.query = {
        query: 'test',
        sortBy: 'invalid',
      };

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should support pagination parameters', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.query = {
        query: 'test',
        pageSize: '25',
        pageIndex: '1',
      };

      (curseForgeProxyService.searchMods as jest.Mock).mockResolvedValue({
        data: [],
        pagination: {
          index: 1,
          pageSize: 25,
          resultCount: 0,
          totalCount: 100,
        },
      });

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
    });

    it('should support category filtering', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.query = {
        query: 'test',
        categoryName: 'Mods',
      };

      (curseForgeProxyService.searchMods as jest.Mock).mockResolvedValue({
        data: [],
        pagination: {
          index: 0,
          pageSize: 50,
          resultCount: 0,
          totalCount: 0,
        },
      });

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(curseForgeProxyService.searchMods).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryName: 'Mods',
        })
      );
    });

    it('should support sorting options', async () => {
      const sortOptions = ['downloads', 'date', 'popularity', 'relevance'];

      for (const sortBy of sortOptions) {
        jest.clearAllMocks();
        mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
        mockRequest.query = { sortBy };

        (curseForgeProxyService.searchMods as jest.Mock).mockResolvedValue({
          data: [],
          pagination: {
            index: 0,
            pageSize: 50,
            resultCount: 0,
            totalCount: 0,
          },
        });

        await controller.searchMods(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(responseStatus).toHaveBeenCalledWith(200);
      }
    });

    it('should return 403 when API key not configured error', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.query = { query: 'test' };

      (curseForgeProxyService.searchMods as jest.Mock).mockRejectedValue(
        new Error('API key not configured')
      );

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'API_KEY_REQUIRED',
          }),
        })
      );
    });

    it('should return 500 for generic service error', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.query = { query: 'test' };

      (curseForgeProxyService.searchMods as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await controller.searchMods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getCategories', () => {
    it('should get all categories', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };

      (curseForgeProxyService.getCategories as jest.Mock).mockResolvedValue([
        { id: 6, name: 'Mods' },
        { id: 7, name: 'Cheats' },
      ]);

      await controller.getCategories(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
        })
      );
    });

    it('should return 403 if API key missing', async () => {
      mockRequest.headers = {};

      await controller.getCategories(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });

    it('should return 403 when API key not configured error', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };

      (curseForgeProxyService.getCategories as jest.Mock).mockRejectedValue(
        new Error('API key not configured')
      );

      await controller.getCategories(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'API_KEY_REQUIRED',
          }),
        })
      );
    });

    it('should return 500 for generic service error', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };

      (curseForgeProxyService.getCategories as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await controller.getCategories(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getMod', () => {
    it('should get mod details', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };

      (curseForgeProxyService.getMod as jest.Mock).mockResolvedValue({
        id: TEST_IDS.MOD_ID_1,
        name: 'Test Mod',
        description: 'Test description',
      });

      await controller.getMod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid modId format', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.params = { modId: 'invalid' };

      await controller.getMod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 403 if API key missing', async () => {
      mockRequest.headers = {};
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };

      await controller.getMod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });

    it('should return 403 when API key not configured error', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };

      (curseForgeProxyService.getMod as jest.Mock).mockRejectedValue(
        new Error('API key not configured')
      );

      await controller.getMod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });

    it('should return 404 for mod not found', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };

      (curseForgeProxyService.getMod as jest.Mock).mockRejectedValue(
        new Error('Mod not found')
      );

      await controller.getMod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });

    it('should return 404 for 404 response status', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };

      const error = new Error('Request failed') as any;
      error.response = { status: 404 };
      (curseForgeProxyService.getMod as jest.Mock).mockRejectedValue(error);

      await controller.getMod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });

    it('should return 500 for generic service error', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.params = { modId: String(TEST_IDS.MOD_ID_1) };

      (curseForgeProxyService.getMod as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await controller.getMod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getDownloadUrl', () => {
    // Access the curseforge-api mock
    const curseForgeApiMock = require('curseforge-api');
    const mockGetMod = curseForgeApiMock.CurseForgeClient.mockGetMod;
    const mockGetModFile = curseForgeApiMock.CurseForgeClient.mockGetModFile;

    beforeEach(() => {
      mockGetMod?.mockReset?.();
      mockGetModFile?.mockReset?.();
    });

    it('should return 403 for missing API key', async () => {
      mockRequest.headers = {};
      mockRequest.body = {
        modId: TEST_IDS.MOD_ID_1,
      };

      await controller.getDownloadUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });

    it('should return 400 for missing modId', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {};

      await controller.getDownloadUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid modId', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modId: -1,
      };

      await controller.getDownloadUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return download URL for mod with downloadUrl', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modId: TEST_IDS.MOD_ID_1,
      };

      mockGetMod?.mockResolvedValue({
        id: TEST_IDS.MOD_ID_1,
        name: 'Test Mod',
        latestFiles: [
          {
            id: 111222,
            fileName: 'test-mod.zip',
            downloadUrl: 'https://example.com/download',
            fileLength: 12345,
          },
        ],
      });

      await controller.getDownloadUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            downloadUrl: 'https://example.com/download',
          }),
        })
      );
    });

    it('should construct download URL when not provided', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modId: TEST_IDS.MOD_ID_1,
      };

      mockGetMod?.mockResolvedValue({
        id: TEST_IDS.MOD_ID_1,
        name: 'Test Mod',
        latestFiles: [
          {
            id: 1234567,
            fileName: 'test-mod.zip',
            downloadUrl: null,
            fileLength: 12345,
          },
        ],
      });

      await controller.getDownloadUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            downloadUrl: expect.stringContaining('edge.forgecdn.net'),
          }),
        })
      );
    });

    it('should return 404 when mod has no files', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modId: TEST_IDS.MOD_ID_1,
      };

      mockGetMod?.mockResolvedValue({
        id: TEST_IDS.MOD_ID_1,
        name: 'Test Mod',
        latestFiles: [],
      });

      await controller.getDownloadUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });

    it('should return 404 when unable to construct URL', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modId: TEST_IDS.MOD_ID_1,
      };

      mockGetMod?.mockResolvedValue({
        id: TEST_IDS.MOD_ID_1,
        name: 'Test Mod',
        latestFiles: [
          {
            id: null,
            fileName: null,
            downloadUrl: null,
          },
        ],
      });

      await controller.getDownloadUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });

    it('should get specific file by fileId', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modId: TEST_IDS.MOD_ID_1,
        fileId: 222333,
      };

      mockGetMod?.mockResolvedValue({
        id: TEST_IDS.MOD_ID_1,
        name: 'Test Mod',
      });

      mockGetModFile?.mockResolvedValue({
        id: 222333,
        fileName: 'specific-file.zip',
        downloadUrl: 'https://example.com/specific',
        fileLength: 5000,
      });

      await controller.getDownloadUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            fileId: 222333,
          }),
        })
      );
    });

    it('should return 500 for service error', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modId: TEST_IDS.MOD_ID_1,
      };

      mockGetMod?.mockRejectedValue(new Error('Network error'));

      await controller.getDownloadUrl(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getLatestVersions', () => {
    it('should get latest versions for multiple mods', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modIds: [TEST_IDS.MOD_ID_1, TEST_IDS.MOD_ID_2],
      };

      (modVersionService.getLatestVersions as jest.Mock).mockResolvedValue({
        [TEST_IDS.MOD_ID_1]: { fileId: 111, fileName: 'mod-1.0.jar' },
        [TEST_IDS.MOD_ID_2]: { fileId: 222, fileName: 'mod-2.0.jar' },
      });

      await controller.getLatestVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
    });

    it('should return 400 for too many mods', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      const tooManyMods = Array.from(
        { length: 101 },
        (_, i) => TEST_IDS.MOD_ID_1 + i
      );
      mockRequest.body = { modIds: tooManyMods };

      await controller.getLatestVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for empty modIds', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = { modIds: [] };

      await controller.getLatestVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 403 for missing API key', async () => {
      mockRequest.headers = {};
      mockRequest.body = {
        modIds: [TEST_IDS.MOD_ID_1],
      };

      await controller.getLatestVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });

    it('should return 403 for API key error', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modIds: [TEST_IDS.MOD_ID_1],
      };

      (modVersionService.getLatestVersions as jest.Mock).mockRejectedValue(
        new Error('API key invalid')
      );

      await controller.getLatestVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
    });

    it('should return 500 for generic service error', async () => {
      mockRequest.headers = { 'x-curseforge-api-key': TEST_API_KEYS.VALID };
      mockRequest.body = {
        modIds: [TEST_IDS.MOD_ID_1],
      };

      (modVersionService.getLatestVersions as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await controller.getLatestVersions(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });
});
