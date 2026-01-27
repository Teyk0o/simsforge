/**
 * Unit tests for LogEnablerService
 * Tests installation, uninstallation, and status checking of the Sims Log Enabler mod
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: vi.fn(),
  exists: vi.fn(),
  remove: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...parts: string[]) => Promise.resolve(parts.join('/'))),
}));

vi.mock('@/lib/apiClient', () => ({
  apiGet: vi.fn(),
}));

import { fetch } from '@tauri-apps/plugin-http';
import { writeFile, exists, remove, mkdir } from '@tauri-apps/plugin-fs';
import { apiGet } from '@/lib/apiClient';

const mockMetadata = {
  version: '1.0.0',
  description: 'Test Log Enabler',
  files: [
    { filename: 'test.ts4script', hash: 'abc123', fileSize: 1234 },
    { filename: 'config.cfg', hash: 'def456', fileSize: 100 },
  ],
};

describe('LogEnablerService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('getMetadata', () => {
    it('should return metadata from API', async () => {
      (apiGet as any).mockResolvedValue({
        success: true,
        data: mockMetadata,
      });

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.getMetadata();

      expect(result).toEqual(mockMetadata);
      expect(apiGet).toHaveBeenCalledWith('/api/v1/tools/sims-log-enabler/metadata');
    });

    it('should throw error when API returns failure', async () => {
      (apiGet as any).mockResolvedValue({
        success: false,
      });

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      await expect(service.getMetadata()).rejects.toThrow(
        'Failed to fetch Log Enabler metadata'
      );
    });
  });

  describe('isInstalled', () => {
    it('should return true when all files exist', async () => {
      (apiGet as any).mockResolvedValue({
        success: true,
        data: mockMetadata,
      });
      (exists as any).mockResolvedValue(true);

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.isInstalled('/mods');

      expect(result).toBe(true);
    });

    it('should return false when a file is missing', async () => {
      (apiGet as any).mockResolvedValue({
        success: true,
        data: mockMetadata,
      });
      (exists as any)
        .mockResolvedValueOnce(true) // first file
        .mockResolvedValueOnce(false); // second file missing

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.isInstalled('/mods');

      expect(result).toBe(false);
    });

    it('should return false when metadata fetch fails', async () => {
      (apiGet as any).mockRejectedValue(new Error('Network error'));

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.isInstalled('/mods');

      expect(result).toBe(false);
    });
  });

  describe('install', () => {
    it('should install all files successfully', async () => {
      (apiGet as any).mockResolvedValue({
        success: true,
        data: mockMetadata,
      });
      (exists as any).mockResolvedValue(true);
      (mkdir as any).mockResolvedValue(undefined);
      (fetch as any).mockResolvedValue({
        ok: true,
        bytes: () => Promise.resolve(new Uint8Array([1, 2, 3])),
      });
      (writeFile as any).mockResolvedValue(undefined);

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.install('/mods');

      expect(result.success).toBe(true);
      expect(writeFile).toHaveBeenCalledTimes(2);
    });

    it('should return error when mods folder not found', async () => {
      (exists as any).mockResolvedValue(false);

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.install('/nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mods folder not found');
    });

    it('should return error when download fails', async () => {
      (apiGet as any).mockResolvedValue({
        success: true,
        data: mockMetadata,
      });
      (exists as any).mockResolvedValue(true);
      (mkdir as any).mockResolvedValue(undefined);
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.install('/mods');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to download');
    });

    it('should create install directory if it does not exist', async () => {
      (apiGet as any).mockResolvedValue({
        success: true,
        data: mockMetadata,
      });
      (exists as any)
        .mockResolvedValueOnce(true) // mods folder exists
        .mockResolvedValueOnce(false); // install dir does not exist
      (mkdir as any).mockResolvedValue(undefined);
      (fetch as any).mockResolvedValue({
        ok: true,
        bytes: () => Promise.resolve(new Uint8Array([1, 2, 3])),
      });
      (writeFile as any).mockResolvedValue(undefined);

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      await service.install('/mods');

      expect(mkdir).toHaveBeenCalledWith('/mods/Sims_Log_Enabler', {
        recursive: true,
      });
    });
  });

  describe('uninstall', () => {
    it('should remove the install folder', async () => {
      (exists as any).mockResolvedValue(true);
      (remove as any).mockResolvedValue(undefined);

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.uninstall('/mods');

      expect(result.success).toBe(true);
      expect(remove).toHaveBeenCalledWith('/mods/Sims_Log_Enabler', {
        recursive: true,
      });
    });

    it('should succeed when folder does not exist', async () => {
      (exists as any).mockResolvedValue(false);

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.uninstall('/mods');

      expect(result.success).toBe(true);
      expect(remove).not.toHaveBeenCalled();
    });

    it('should return error on remove failure', async () => {
      (exists as any).mockResolvedValue(true);
      (remove as any).mockRejectedValue(new Error('Permission denied'));

      const { LogEnablerService } = await import(
        '@/lib/services/LogEnablerService'
      );
      const service = new LogEnablerService();

      const result = await service.uninstall('/mods');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });
});
