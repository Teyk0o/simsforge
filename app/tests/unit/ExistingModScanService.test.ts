/**
 * Unit tests for ExistingModScanService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExistingModScanService } from '@/lib/services/ExistingModScanService';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  basename: vi.fn((path: string) => path.split('/').pop() || ''),
  appDataDir: vi.fn(() => Promise.resolve('/mock/appdata')),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  readDir: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/services/ModCacheService', () => ({
  modCacheService: {
    initialize: vi.fn(),
    addGroupToCache: vi.fn(),
    getCachePath: vi.fn(),
  },
}));

vi.mock('@/lib/services/ProfileService', () => ({
  profileService: {
    initialize: vi.fn(),
    createProfile: vi.fn(),
    addModToProfile: vi.fn(),
    getAllProfiles: vi.fn(),
  },
}));

vi.mock('@/lib/services/DiskPerformanceService', () => ({
  diskPerformanceService: {
    getPoolSize: vi.fn(() => Promise.resolve(3)),
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-1234'),
}));

import { invoke } from '@tauri-apps/api/core';
import { modCacheService } from '@/lib/services/ModCacheService';
import { profileService } from '@/lib/services/ProfileService';

describe('ExistingModScanService', () => {
  let service: ExistingModScanService;

  beforeEach(() => {
    service = new ExistingModScanService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('scanAndImport', () => {
    it('should return empty result when no mods found', async () => {
      vi.mocked(invoke).mockResolvedValue({
        groups: [],
        total_files: 0,
        total_groups: 0,
        errors: [],
      });

      const progressCb = vi.fn();
      const result = await service.scanAndImport('/mock/Mods', progressCb);

      expect(result.imported).toBe(0);
      expect(result.profileId).toBe('');
      expect(invoke).toHaveBeenCalledWith('scan_mods_folder', {
        modsPath: '/mock/Mods',
      });
    });

    it('should create profile and import mods when found', async () => {
      vi.mocked(invoke).mockResolvedValue({
        groups: [
          {
            group_name: 'WickedWhims',
            is_folder: true,
            files: [
              { path: '/Mods/WickedWhims/ww.package', file_name: 'ww.package', size: 1024 },
              { path: '/Mods/WickedWhims/ww.ts4script', file_name: 'ww.ts4script', size: 512 },
            ],
            total_size: 1536,
            combined_hash: 'abc123',
          },
          {
            group_name: 'loose_mod',
            is_folder: false,
            files: [
              { path: '/Mods/loose_mod.package', file_name: 'loose_mod.package', size: 256 },
            ],
            total_size: 256,
            combined_hash: 'def456',
          },
        ],
        total_files: 3,
        total_groups: 2,
        errors: [],
      });

      vi.mocked(profileService.getAllProfiles).mockResolvedValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'new-profile-id',
        name: 'My Old Mods',
        description: 'Auto-imported from existing Sims 4 Mods folder',
        tags: ['imported'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        mods: [],
        isActive: false,
      });

      vi.mocked(modCacheService.addGroupToCache).mockResolvedValue({
        fileHash: 'abc123',
        modId: 'mock-uuid-1234',
        fileName: 'WickedWhims',
        fileSize: 1536,
        downloadedAt: '2024-01-01',
        usedByProfiles: ['new-profile-id'],
        files: [],
      });

      const progressCb = vi.fn();
      const result = await service.scanAndImport('/mock/Mods', progressCb);

      expect(profileService.createProfile).toHaveBeenCalledWith(
        'My Old Mods',
        'Auto-imported from existing Sims 4 Mods folder',
        ['imported']
      );
      expect(modCacheService.addGroupToCache).toHaveBeenCalledTimes(2);
      expect(profileService.addModToProfile).toHaveBeenCalledTimes(2);
      expect(result.imported).toBe(2);
      expect(result.profileName).toBe('My Old Mods');
      expect(result.totalFiles).toBe(3);
    });

    it('should generate unique profile name when default exists', async () => {
      vi.mocked(invoke).mockResolvedValue({
        groups: [
          {
            group_name: 'test',
            is_folder: false,
            files: [{ path: '/Mods/test.package', file_name: 'test.package', size: 100 }],
            total_size: 100,
            combined_hash: 'hash1',
          },
        ],
        total_files: 1,
        total_groups: 1,
        errors: [],
      });

      vi.mocked(profileService.getAllProfiles).mockResolvedValue([
        {
          id: 'existing',
          name: 'My Old Mods',
          description: '',
          tags: [],
          createdAt: '',
          updatedAt: '',
          mods: [],
          isActive: false,
        },
      ]);

      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'new-id',
        name: 'My Old Mods (2)',
        description: '',
        tags: ['imported'],
        createdAt: '',
        updatedAt: '',
        mods: [],
        isActive: false,
      });

      vi.mocked(modCacheService.addGroupToCache).mockResolvedValue({
        fileHash: 'hash1',
        modId: 'mock-uuid-1234',
        fileName: 'test',
        fileSize: 100,
        downloadedAt: '',
        usedByProfiles: ['new-id'],
        files: [],
      });

      const result = await service.scanAndImport('/mock/Mods', vi.fn());

      expect(profileService.createProfile).toHaveBeenCalledWith(
        'My Old Mods (2)',
        expect.any(String),
        ['imported']
      );
    });

    it('should count skipped mods (already cached)', async () => {
      vi.mocked(invoke).mockResolvedValue({
        groups: [
          {
            group_name: 'cached_mod',
            is_folder: false,
            files: [{ path: '/Mods/cached.package', file_name: 'cached.package', size: 100 }],
            total_size: 100,
            combined_hash: 'existing-hash',
          },
        ],
        total_files: 1,
        total_groups: 1,
        errors: [],
      });

      vi.mocked(profileService.getAllProfiles).mockResolvedValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'p-id',
        name: 'My Old Mods',
        description: '',
        tags: [],
        createdAt: '',
        updatedAt: '',
        mods: [],
        isActive: false,
      });

      // usedByProfiles.length > 1 means it was already cached
      vi.mocked(modCacheService.addGroupToCache).mockResolvedValue({
        fileHash: 'existing-hash',
        modId: 'mock-uuid-1234',
        fileName: 'cached_mod',
        fileSize: 100,
        downloadedAt: '',
        usedByProfiles: ['other-profile', 'p-id'],
        files: [],
      });

      const result = await service.scanAndImport('/mock/Mods', vi.fn());

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
    });

    it('should handle scan errors gracefully', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Folder not found'));

      const result = await service.scanAndImport('/invalid/path', vi.fn());

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Folder not found');
    });

    it('should report progress during scan and import phases', async () => {
      vi.mocked(invoke).mockResolvedValue({
        groups: [
          {
            group_name: 'mod1',
            is_folder: false,
            files: [{ path: '/Mods/mod1.package', file_name: 'mod1.package', size: 100 }],
            total_size: 100,
            combined_hash: 'h1',
          },
        ],
        total_files: 1,
        total_groups: 1,
        errors: [],
      });

      vi.mocked(profileService.getAllProfiles).mockResolvedValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'p-id',
        name: 'My Old Mods',
        description: '',
        tags: [],
        createdAt: '',
        updatedAt: '',
        mods: [],
        isActive: false,
      });

      vi.mocked(modCacheService.addGroupToCache).mockResolvedValue({
        fileHash: 'h1',
        modId: 'mock-uuid-1234',
        fileName: 'mod1',
        fileSize: 100,
        downloadedAt: '',
        usedByProfiles: ['p-id'],
        files: [],
      });

      const progressCb = vi.fn();
      await service.scanAndImport('/mock/Mods', progressCb);

      const phases = progressCb.mock.calls.map((c: any[]) => c[0].phase);
      expect(phases).toContain('importing');
      expect(phases).toContain('complete');
    });

    it('should set correct ProfileMod fields for folder groups', async () => {
      vi.mocked(invoke).mockResolvedValue({
        groups: [
          {
            group_name: 'MCCC',
            is_folder: true,
            files: [
              { path: '/Mods/MCCC/mc_cmd.ts4script', file_name: 'mc_cmd.ts4script', size: 500 },
              { path: '/Mods/MCCC/mc_cas.package', file_name: 'mc_cas.package', size: 300 },
            ],
            total_size: 800,
            combined_hash: 'mccc-hash',
          },
        ],
        total_files: 2,
        total_groups: 1,
        errors: [],
      });

      vi.mocked(profileService.getAllProfiles).mockResolvedValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'p-id',
        name: 'My Old Mods',
        description: '',
        tags: [],
        createdAt: '',
        updatedAt: '',
        mods: [],
        isActive: false,
      });

      vi.mocked(modCacheService.addGroupToCache).mockResolvedValue({
        fileHash: 'mccc-hash',
        modId: 'mock-uuid-1234',
        fileName: 'MCCC',
        fileSize: 800,
        downloadedAt: '',
        usedByProfiles: ['p-id'],
        files: [],
      });

      await service.scanAndImport('/mock/Mods', vi.fn());

      expect(profileService.addModToProfile).toHaveBeenCalledWith(
        'p-id',
        expect.objectContaining({
          localModId: 'mock-uuid-1234',
          isLocal: true,
          modName: 'MCCC',
          fileHash: 'mccc-hash',
          fileName: 'MCCC',
          enabled: true,
          cacheLocation: 'mccc-hash',
        })
      );
    });

    it('should set fileName to actual file name for loose files', async () => {
      vi.mocked(invoke).mockResolvedValue({
        groups: [
          {
            group_name: 'loose_mod',
            is_folder: false,
            files: [
              { path: '/Mods/loose_mod.package', file_name: 'loose_mod.package', size: 100 },
            ],
            total_size: 100,
            combined_hash: 'loose-hash',
          },
        ],
        total_files: 1,
        total_groups: 1,
        errors: [],
      });

      vi.mocked(profileService.getAllProfiles).mockResolvedValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'p-id',
        name: 'My Old Mods',
        description: '',
        tags: [],
        createdAt: '',
        updatedAt: '',
        mods: [],
        isActive: false,
      });

      vi.mocked(modCacheService.addGroupToCache).mockResolvedValue({
        fileHash: 'loose-hash',
        modId: 'mock-uuid-1234',
        fileName: 'loose_mod',
        fileSize: 100,
        downloadedAt: '',
        usedByProfiles: ['p-id'],
        files: [],
      });

      await service.scanAndImport('/mock/Mods', vi.fn());

      expect(profileService.addModToProfile).toHaveBeenCalledWith(
        'p-id',
        expect.objectContaining({
          fileName: 'loose_mod.package',
        })
      );
    });
  });
});
