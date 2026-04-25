/**
 * Unit tests for ModCacheService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModCacheService } from '@/lib/services/ModCacheService';

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  readDir: vi.fn(),
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

vi.mock('@/lib/services/DiskPerformanceService', () => ({
  diskPerformanceService: {
    getPoolSize: vi.fn(() => Promise.resolve(3)),
  },
}));

import { writeFile, readFile, exists, mkdir, readDir } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';

describe('ModCacheService', () => {
  let service: ModCacheService;

  const mockIndex = {
    version: '1.0.0',
    entries: {},
    lastCleanup: '2024-01-01',
  };

  beforeEach(async () => {
    service = new ModCacheService();
    vi.clearAllMocks();

    // Setup default mocks for initialization
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readFile).mockResolvedValue(
      new TextEncoder().encode(JSON.stringify(mockIndex))
    );

    await service.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('addToCache - non-ZIP handling', () => {
    it('should copy .package files directly instead of extracting', async () => {
      vi.mocked(invoke).mockImplementation(async (cmd: string, args?: any) => {
        if (cmd === 'calculate_file_hash') return 'hash-pkg';
        if (cmd === 'get_file_size') return 1024;
        if (cmd === 'copy_file_to') return undefined;
        return undefined;
      });

      vi.mocked(readDir).mockResolvedValue([
        { name: 'mod.package', isDirectory: false, isFile: true, isSymlink: false },
      ] as any);

      const result = await service.addToCache(
        'local-id',
        'mod.package',
        '/path/to/mod.package',
        'profile-1'
      );

      expect(invoke).toHaveBeenCalledWith('copy_file_to', {
        source: '/path/to/mod.package',
        target: expect.stringContaining('mod.package'),
      });
      expect(invoke).not.toHaveBeenCalledWith(
        'extract_zip',
        expect.anything()
      );
      expect(result.fileHash).toBe('hash-pkg');
    });

    it('should copy .ts4script files directly instead of extracting', async () => {
      vi.mocked(invoke).mockImplementation(async (cmd: string) => {
        if (cmd === 'calculate_file_hash') return 'hash-ts4';
        if (cmd === 'get_file_size') return 2048;
        if (cmd === 'copy_file_to') return undefined;
        return undefined;
      });

      vi.mocked(readDir).mockResolvedValue([
        { name: 'script.ts4script', isDirectory: false, isFile: true, isSymlink: false },
      ] as any);

      const result = await service.addToCache(
        'local-id',
        'script.ts4script',
        '/path/to/script.ts4script',
        'profile-1'
      );

      expect(invoke).toHaveBeenCalledWith('copy_file_to', {
        source: '/path/to/script.ts4script',
        target: expect.stringContaining('script.ts4script'),
      });
    });

    it('should use extract_zip for .zip files', async () => {
      vi.mocked(invoke).mockImplementation(async (cmd: string) => {
        if (cmd === 'calculate_file_hash') return 'hash-zip';
        if (cmd === 'get_file_size') return 4096;
        if (cmd === 'extract_zip') return undefined;
        return undefined;
      });

      vi.mocked(readDir).mockResolvedValue([]);

      await service.addToCache(
        'local-id',
        'mod.zip',
        '/path/to/mod.zip',
        'profile-1'
      );

      expect(invoke).toHaveBeenCalledWith('extract_zip', {
        zipPath: '/path/to/mod.zip',
        destDir: expect.any(String),
      });
    });
  });

  describe('addGroupToCache', () => {
    it('should copy all files and create cache entry', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const result = await service.addGroupToCache(
        'mod-uuid',
        'WickedWhims',
        ['/Mods/WickedWhims/ww.package', '/Mods/WickedWhims/ww.ts4script'],
        'combined-hash-abc',
        1536,
        'profile-1'
      );

      expect(mkdir).toHaveBeenCalled();
      expect(invoke).toHaveBeenCalledWith('copy_file_to', {
        source: '/Mods/WickedWhims/ww.package',
        target: expect.stringContaining('ww.package'),
      });
      expect(invoke).toHaveBeenCalledWith('copy_file_to', {
        source: '/Mods/WickedWhims/ww.ts4script',
        target: expect.stringContaining('ww.ts4script'),
      });
      expect(result.fileHash).toBe('combined-hash-abc');
      expect(result.fileName).toBe('WickedWhims');
      expect(result.fileSize).toBe(1536);
      expect(result.usedByProfiles).toContain('profile-1');
      expect(result.files).toHaveLength(2);
    });

    it('should return existing entry and add profile if already cached', async () => {
      const existingEntry = {
        fileHash: 'existing-hash',
        modId: 'old-uuid',
        fileName: 'MCCC',
        fileSize: 800,
        downloadedAt: '2024-01-01',
        usedByProfiles: ['other-profile'],
        files: [],
      };

      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            ...mockIndex,
            entries: { 'existing-hash': existingEntry },
          })
        )
      );

      const result = await service.addGroupToCache(
        'new-uuid',
        'MCCC',
        ['/Mods/MCCC/mc.package'],
        'existing-hash',
        800,
        'profile-2'
      );

      expect(result.usedByProfiles).toContain('other-profile');
      expect(result.usedByProfiles).toContain('profile-2');
      // Should NOT have called copy_file_to since it's already cached
      expect(invoke).not.toHaveBeenCalledWith(
        'copy_file_to',
        expect.anything()
      );
    });

    it('should not duplicate profile in usedByProfiles', async () => {
      const existingEntry = {
        fileHash: 'dup-hash',
        modId: 'uuid-1',
        fileName: 'Mod',
        fileSize: 100,
        downloadedAt: '2024-01-01',
        usedByProfiles: ['profile-1'],
        files: [],
      };

      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            ...mockIndex,
            entries: { 'dup-hash': existingEntry },
          })
        )
      );

      const result = await service.addGroupToCache(
        'uuid-2',
        'Mod',
        ['/Mods/mod.package'],
        'dup-hash',
        100,
        'profile-1'
      );

      expect(
        result.usedByProfiles.filter((p: string) => p === 'profile-1')
      ).toHaveLength(1);
    });

    it('should save metadata.json for new cache entries', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await service.addGroupToCache(
        'mod-uuid',
        'TestMod',
        ['/Mods/test.package'],
        'new-hash',
        500,
        'profile-1'
      );

      const writeFileCalls = vi.mocked(writeFile).mock.calls;
      const metadataWrite = writeFileCalls.find((call) =>
        (call[0] as string).includes('metadata.json')
      );
      expect(metadataWrite).toBeDefined();

      const written = JSON.parse(
        new TextDecoder().decode(metadataWrite![1] as Uint8Array)
      );
      expect(written.fileHash).toBe('new-hash');
      expect(written.fileName).toBe('TestMod');
    });
  });

  describe('findModFiles', () => {
    it('should find both .package and .ts4script files', async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: 'mod.package', isDirectory: false, isFile: true, isSymlink: false },
        { name: 'script.ts4script', isDirectory: false, isFile: true, isSymlink: false },
        { name: 'readme.txt', isDirectory: false, isFile: true, isSymlink: false },
      ] as any);

      // @ts-ignore - accessing private method for testing
      const result = await service.findModFiles('/cache/dir');

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('mod.package');
      expect(result[1]).toContain('script.ts4script');
    });

    it('should ignore non-mod files', async () => {
      vi.mocked(readDir).mockResolvedValue([
        { name: 'readme.txt', isDirectory: false, isFile: true, isSymlink: false },
        { name: 'image.png', isDirectory: false, isFile: true, isSymlink: false },
      ] as any);

      // @ts-ignore
      const result = await service.findModFiles('/cache/dir');

      expect(result).toHaveLength(0);
    });
  });
});
