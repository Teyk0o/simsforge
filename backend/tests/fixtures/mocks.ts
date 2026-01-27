/**
 * Prisma and service mocks for testing
 */

import { PrismaClient } from '@prisma/client';

/**
 * Mock Prisma client
 * Used for unit tests to avoid database dependencies
 */
export const mockPrismaClient = () => {
  return {
    modReport: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    warnedMod: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    bannedCreator: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaClient;
};

/**
 * Mock HTTP axios calls for CurseForge API
 */
export const mockCurseForgeApiResponse = {
  searchMods: {
    data: {
      data: [
        {
          id: 123456,
          name: 'Test Mod 1',
          summary: 'A test mod for unit testing',
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
              projectFileName: 'test-mod-1.0.jar',
            },
          ],
          isAvailable: true,
          isFeatured: false,
          primaryLanguage: 'enUS',
          classesUrl: 'https://example.com',
          dateCreated: '2024-01-01T00:00:00.000Z',
          dateModified: '2024-01-15T00:00:00.000Z',
          dateReleased: '2024-01-01T00:00:00.000Z',
          mainFileId: 111,
          defaultFileId: 111,
          allowModDistribution: true,
          viewCount: 2000,
          status: 4,
          appId: 432,
          latestFilesIndexes: [],
          latestReleaseFileId: 111,
          popularityScore: 8.5,
          slug: 'test-mod-1',
          stage: 'Release',
          gameId: 432,
          thumbsUpCount: 100,
          rating: 4.5,
        },
      ],
      pagination: {
        index: 0,
        pageSize: 50,
        resultCount: 1,
        totalCount: 1,
      },
    },
  },
  getMod: {
    data: {
      data: {
        id: 123456,
        name: 'Test Mod 1',
        summary: 'A test mod for unit testing',
        description: 'This is a detailed description of the test mod.',
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
      },
    },
  },
  getCategories: {
    data: {
      data: [
        {
          id: 6,
          name: 'Mods',
          slug: 'mods',
          url: 'https://www.curseforge.com/sims4/mods',
          iconUrl: 'https://example.com/icon.png',
          dateModified: '2024-01-01T00:00:00.000Z',
          isClass: false,
          displayIndex: 0,
          parentCategoryId: null,
          gameId: 432,
        },
        {
          id: 7,
          name: 'Cheats',
          slug: 'cheats',
          url: 'https://www.curseforge.com/sims4/mods/cheats',
          iconUrl: 'https://example.com/icon2.png',
          dateModified: '2024-01-01T00:00:00.000Z',
          isClass: false,
          displayIndex: 1,
          parentCategoryId: 6,
          gameId: 432,
        },
      ],
    },
  },
};

/**
 * Mock ZIP analysis response from Tauri
 */
export const mockZipAnalysis = {
  valid: {
    hasPackageFiles: true,
    hasTsScript: true,
    fileList: [
      'mod.package',
      'script.ts4script',
      'README.txt',
      'license.txt',
    ],
    suspiciousFiles: [],
    totalFiles: 4,
  },
  noScripts: {
    hasPackageFiles: false,
    hasTsScript: false,
    fileList: ['README.txt', 'LICENSE.txt', 'LINK.txt'],
    suspiciousFiles: [],
    totalFiles: 3,
  },
  suspicious: {
    hasPackageFiles: false,
    hasTsScript: false,
    fileList: ['README.txt', 'DOWNLOAD_HERE.html', 'virus.exe'],
    suspiciousFiles: ['virus.exe'],
    totalFiles: 3,
  },
};

/**
 * Mock database records
 */
export const mockDatabaseRecords = {
  modReport: {
    id: 'report-1',
    modId: 123456,
    machineId: 'machine-uuid-1',
    reason: 'Missing mod files',
    fakeScore: 75,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  },
  warnedMod: {
    id: 'warned-1',
    modId: 123456,
    reportCount: 3,
    isAutoWarned: true,
    warningReason: 'Detected as fake mod',
    creatorId: 1001,
    warnedAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  },
  bannedCreator: {
    id: 'banned-1',
    creatorId: 1001,
    creatorName: 'Spam Creator',
    modsBannedCount: 3,
    bannedAt: new Date('2024-01-15T10:00:00Z'),
  },
};
