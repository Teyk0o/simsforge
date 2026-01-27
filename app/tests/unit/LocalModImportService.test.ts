/**
 * Unit tests for LocalModImportService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalModImportService } from '@/lib/services/LocalModImportService';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  basename: vi.fn((path: string) => path.split('/').pop() || ''),
  appDataDir: vi.fn(() => Promise.resolve('/mock/appdata')),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock services
vi.mock('@/lib/services/ModCacheService', () => ({
  modCacheService: {
    addToCache: vi.fn(),
  },
}));

vi.mock('@/lib/services/ProfileService', () => ({
  profileService: {
    getActiveProfile: vi.fn(),
    addModToProfile: vi.fn(),
  },
}));

vi.mock('@/lib/services/FakeScoreService', () => ({
  fakeScoreService: {
    analyzeZip: vi.fn(),
    calculateScore: vi.fn(),
  },
}));

import { open } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile, exists, mkdir, remove } from '@tauri-apps/plugin-fs';
import { modCacheService } from '@/lib/services/ModCacheService';
import { profileService } from '@/lib/services/ProfileService';
import { fakeScoreService } from '@/lib/services/FakeScoreService';

describe('LocalModImportService', () => {
  let service: LocalModImportService;

  beforeEach(() => {
    service = new LocalModImportService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('extractModName', () => {
    it('should extract mod name from .package file', () => {
      // @ts-ignore - accessing private method for testing
      const result = service.extractModName('MyAwesomeMod.package');
      expect(result).toBe('MyAwesomeMod');
    });

    it('should extract mod name from .ts4script file', () => {
      // @ts-ignore
      const result = service.extractModName('ScriptMod.ts4script');
      expect(result).toBe('ScriptMod');
    });

    it('should extract mod name from .zip file', () => {
      // @ts-ignore
      const result = service.extractModName('ModCollection.zip');
      expect(result).toBe('ModCollection');
    });

    it('should replace spaces with underscores', () => {
      // @ts-ignore
      const result = service.extractModName('My Awesome Mod.package');
      expect(result).toBe('My_Awesome_Mod');
    });

    it('should sanitize special characters', () => {
      // @ts-ignore
      const result = service.extractModName('Mod | Polish.package');
      expect(result).toBe('Mod_Polish');
    });

    it('should handle parentheses', () => {
      // @ts-ignore
      const result = service.extractModName('Test (v2).ts4script');
      expect(result).toBe('Test_v2');
    });

    it('should handle multiple consecutive spaces/underscores', () => {
      // @ts-ignore
      const result = service.extractModName('Mod   With    Spaces.package');
      expect(result).toBe('Mod_With_Spaces');
    });

    it('should return default name for empty filename', () => {
      // @ts-ignore
      const result = service.extractModName('.package');
      expect(result).toBe('Imported_Mod');
    });

    it('should trim leading/trailing whitespace', () => {
      // @ts-ignore
      const result = service.extractModName('  ModName  .package');
      expect(result).toBe('ModName');
    });
  });

  describe('isValidModFile', () => {
    it('should return true for .package files', () => {
      // @ts-ignore
      expect(service.isValidModFile('test.package')).toBe(true);
    });

    it('should return true for .ts4script files', () => {
      // @ts-ignore
      expect(service.isValidModFile('test.ts4script')).toBe(true);
    });

    it('should return true for .zip files', () => {
      // @ts-ignore
      expect(service.isValidModFile('test.zip')).toBe(true);
    });

    it('should be case insensitive', () => {
      // @ts-ignore
      expect(service.isValidModFile('test.PACKAGE')).toBe(true);
      // @ts-ignore
      expect(service.isValidModFile('test.Zip')).toBe(true);
    });

    it('should return false for invalid extensions', () => {
      // @ts-ignore
      expect(service.isValidModFile('test.txt')).toBe(false);
      // @ts-ignore
      expect(service.isValidModFile('test.jpg')).toBe(false);
      // @ts-ignore
      expect(service.isValidModFile('test.exe')).toBe(false);
    });

    it('should return false for files without extensions', () => {
      // @ts-ignore
      expect(service.isValidModFile('testfile')).toBe(false);
    });
  });

  describe('importModFiles', () => {
    beforeEach(() => {
      vi.mocked(profileService.getActiveProfile).mockResolvedValue({
        id: 'profile-1',
        name: 'Test Profile',
        description: 'Test',
        tags: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        mods: [],
        isActive: true,
      });
    });

    it('should throw error when no active profile', async () => {
      vi.mocked(profileService.getActiveProfile).mockResolvedValue(null);

      await expect(service.importModFiles()).rejects.toThrow('No active profile selected');
    });

    it('should return empty summary when no files selected', async () => {
      vi.mocked(open).mockResolvedValue(null);

      const result = await service.importModFiles();

      expect(result).toEqual({
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
        importedMods: [],
      });
    });

    it('should return empty summary when empty array selected', async () => {
      vi.mocked(open).mockResolvedValue([]);

      const result = await service.importModFiles();

      expect(result).toEqual({
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
        importedMods: [],
      });
    });

    it('should reject invalid file types', async () => {
      vi.mocked(open).mockResolvedValue(['/path/to/invalid.txt']);
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(new Uint8Array());

      const result = await service.importModFiles();

      expect(result.total).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('Unsupported file type');
    });

    it('should successfully import a valid .package file', async () => {
      vi.mocked(open).mockResolvedValue(['/path/to/mod.package']);
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));
      vi.mocked(modCacheService.addToCache).mockResolvedValue({
        fileHash: 'abc123',
        modId: 'uuid-1',
        fileName: 'mod.package',
        fileSize: 1024,
        downloadedAt: '2024-01-01',
        usedByProfiles: ['profile-1'],
        files: [],
      });

      const result = await service.importModFiles();

      expect(result.total).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.importedMods).toHaveLength(1);
      expect(result.importedMods[0].modName).toBe('mod');
      expect(result.importedMods[0].isLocal).toBe(true);
    });

    it('should call progress callback during import', async () => {
      vi.mocked(open).mockResolvedValue(['/path/to/mod1.package', '/path/to/mod2.package']);
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));
      vi.mocked(modCacheService.addToCache).mockResolvedValue({
        fileHash: 'abc123',
        modId: 'uuid-1',
        fileName: 'mod.package',
        fileSize: 1024,
        downloadedAt: '2024-01-01',
        usedByProfiles: ['profile-1'],
        files: [],
      });

      const progressCallback = vi.fn();
      await service.importModFiles(progressCallback);

      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'analyzing',
          currentIndex: 1,
          totalFiles: 2,
        })
      );
    });

    it('should perform fake detection on ZIP files', async () => {
      vi.mocked(open).mockResolvedValue(['/path/to/mod.zip']);
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));
      vi.mocked(fakeScoreService.analyzeZip).mockResolvedValue({
        has_package_files: true,
        has_ts_script: false,
        file_list: ['mod.package'],
        total_files: 1,
        zip_size_bytes: 1024,
      });
      vi.mocked(fakeScoreService.calculateScore).mockReturnValue({
        score: 10,
        reasons: [],
        isSuspicious: false,
      });
      vi.mocked(modCacheService.addToCache).mockResolvedValue({
        fileHash: 'abc123',
        modId: 'uuid-1',
        fileName: 'mod.zip',
        fileSize: 1024,
        downloadedAt: '2024-01-01',
        usedByProfiles: ['profile-1'],
        files: [],
      });

      const fakeDetectionCallback = vi.fn().mockResolvedValue('install');
      const result = await service.importModFiles(undefined, fakeDetectionCallback);

      expect(fakeScoreService.analyzeZip).toHaveBeenCalled();
      expect(fakeScoreService.calculateScore).toHaveBeenCalled();
      expect(result.successful).toBe(1);
    });

    it('should handle fake detection callback for suspicious mods', async () => {
      vi.mocked(open).mockResolvedValue(['/path/to/suspicious.zip']);
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));
      vi.mocked(fakeScoreService.analyzeZip).mockResolvedValue({
        has_package_files: false,
        has_ts_script: false,
        file_list: ['readme.txt'],
        total_files: 1,
        zip_size_bytes: 512,
      });
      vi.mocked(fakeScoreService.calculateScore).mockReturnValue({
        score: 60,
        reasons: ['No mod files detected'],
        isSuspicious: true,
      });

      const fakeDetectionCallback = vi.fn().mockResolvedValue('cancel');

      const result = await service.importModFiles(undefined, fakeDetectionCallback);

      expect(fakeDetectionCallback).toHaveBeenCalled();
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('Cancelled by user');
    });

    it('should cleanup temp directory after successful import', async () => {
      vi.mocked(open).mockResolvedValue(['/path/to/mod.package']);
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));
      vi.mocked(modCacheService.addToCache).mockResolvedValue({
        fileHash: 'abc123',
        modId: 'uuid-1',
        fileName: 'mod.package',
        fileSize: 1024,
        downloadedAt: '2024-01-01',
        usedByProfiles: ['profile-1'],
        files: [],
      });

      await service.importModFiles();

      expect(remove).toHaveBeenCalled();
    });

    it('should cleanup temp directory after failed import', async () => {
      vi.mocked(open).mockResolvedValue(['/path/to/mod.package']);
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockRejectedValue(new Error('Read failed'));

      await service.importModFiles();

      expect(remove).toHaveBeenCalled();
    });
  });
});
