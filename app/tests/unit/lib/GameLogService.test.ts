/**
 * Unit tests for GameLogService
 * Tests log file monitoring, parsing, and filtering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  exists: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...parts: string[]) => Promise.resolve(parts.join('/'))),
}));

import { readDir, readTextFile, exists, remove } from '@tauri-apps/plugin-fs';

describe('GameLogService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseLogLine', () => {
    it('should parse standard log format', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();

      // Access private method through prototype
      const parseLogLine = (service as any).parseLogLine.bind(service);

      const result = parseLogLine('13:01:31.002010 [INFO] Test message', 'test');

      expect(result).toEqual({
        timestamp: '13:01:31.002010',
        level: 'INFO',
        message: 'Test message',
        source: 'test',
        raw: '13:01:31.002010 [INFO] Test message',
      });
    });

    it('should handle WARN level', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const parseLogLine = (service as any).parseLogLine.bind(service);

      const result = parseLogLine('10:00:00.000000 [WARN] Warning!', 'test');

      expect(result?.level).toBe('WARN');
    });

    it('should handle ERROR level', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const parseLogLine = (service as any).parseLogLine.bind(service);

      const result = parseLogLine('10:00:00.000000 [ERROR] Something failed', 'test');

      expect(result?.level).toBe('ERROR');
    });

    it('should filter DEBUG logs by default', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const parseLogLine = (service as any).parseLogLine.bind(service);

      const result = parseLogLine('10:00:00.000000 [DEBUG] Debug info', 'test');

      expect(result).toBeNull();
    });

    it('should include DEBUG logs when enabled', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      (service as any).includeDebugLogs = true;
      const parseLogLine = (service as any).parseLogLine.bind(service);

      const result = parseLogLine('10:00:00.000000 [DEBUG] Debug info', 'test');

      expect(result?.level).toBe('DEBUG');
    });

    it('should filter DEBUG in fallback format', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const parseLogLine = (service as any).parseLogLine.bind(service);

      // Non-standard format containing [DEBUG]
      const result = parseLogLine('Some text [DEBUG] more text', 'test');

      expect(result).toBeNull();
    });

    it('should handle non-standard format as INFO', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const parseLogLine = (service as any).parseLogLine.bind(service);

      const result = parseLogLine('Just a plain message', 'test');

      expect(result?.level).toBe('INFO');
      expect(result?.timestamp).toBe('');
      expect(result?.message).toBe('Just a plain message');
    });

    it('should return null for empty lines', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const parseLogLine = (service as any).parseLogLine.bind(service);

      expect(parseLogLine('', 'test')).toBeNull();
      expect(parseLogLine('   ', 'test')).toBeNull();
    });
  });

  describe('startWatching', () => {
    it('should return false when logs folder not found', async () => {
      (exists as any).mockResolvedValue(false);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const callback = vi.fn();

      const result = await service.startWatching('/mods', callback);

      expect(result).toBe(false);
    });

    it('should start watching when logs folder exists', async () => {
      (exists as any).mockResolvedValue(true);
      (readDir as any).mockResolvedValue([]);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const callback = vi.fn();

      const result = await service.startWatching('/mods', callback);

      expect(result).toBe(true);
      expect(service.isActive()).toBe(true);

      service.stopWatching();
    });

    it('should stop previous watcher before starting new one', async () => {
      (exists as any).mockResolvedValue(true);
      (readDir as any).mockResolvedValue([]);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      await service.startWatching('/mods', callback1);
      await service.startWatching('/mods', callback2);

      expect(service.isActive()).toBe(true);

      service.stopWatching();
    });

    it('should pass includeDebugLogs option', async () => {
      (exists as any).mockResolvedValue(true);
      (readDir as any).mockResolvedValue([]);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const callback = vi.fn();

      await service.startWatching('/mods', callback, 1000, { includeDebugLogs: true });

      expect((service as any).includeDebugLogs).toBe(true);

      service.stopWatching();
    });
  });

  describe('stopWatching', () => {
    it('should stop watching and clear state', async () => {
      (exists as any).mockResolvedValue(true);
      (readDir as any).mockResolvedValue([]);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      const callback = vi.fn();

      await service.startWatching('/mods', callback);
      service.stopWatching();

      expect(service.isActive()).toBe(false);
    });
  });

  describe('getLogFiles', () => {
    it('should return list of .log files', async () => {
      (exists as any).mockResolvedValue(true);
      (readDir as any).mockResolvedValue([
        { name: 'game.log' },
        { name: 'script.log' },
        { name: 'readme.txt' },
      ]);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      service.setModsPath('/mods');

      const result = await service.getLogFiles();

      expect(result).toEqual(['game.log', 'script.log']);
    });

    it('should return empty array when no mods path', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();

      const result = await service.getLogFiles();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (exists as any).mockResolvedValue(true);
      (readDir as any).mockRejectedValue(new Error('Read error'));

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      service.setModsPath('/mods');

      const result = await service.getLogFiles();

      expect(result).toEqual([]);
    });
  });

  describe('readLogFile', () => {
    it('should parse all lines from log file', async () => {
      (exists as any).mockResolvedValue(true);
      (readTextFile as any).mockResolvedValue(
        '10:00:00.000000 [INFO] Line 1\n10:00:01.000000 [WARN] Line 2\n'
      );

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      service.setModsPath('/mods');

      const result = await service.readLogFile('game.log');

      expect(result).toHaveLength(2);
      expect(result[0].level).toBe('INFO');
      expect(result[1].level).toBe('WARN');
    });

    it('should return empty array when logs path not found', async () => {
      (exists as any).mockResolvedValue(false);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      service.setModsPath('/mods');

      const result = await service.readLogFile('game.log');

      expect(result).toEqual([]);
    });
  });

  describe('clearLogs', () => {
    it('should delete all .log files', async () => {
      (exists as any).mockResolvedValue(true);
      (readDir as any).mockResolvedValue([
        { name: 'game.log' },
        { name: 'script.log' },
      ]);
      (remove as any).mockResolvedValue(undefined);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      service.setModsPath('/mods');

      const result = await service.clearLogs();

      expect(result).toBe(true);
      expect(remove).toHaveBeenCalledTimes(2);
    });

    it('should return false when logs path not found', async () => {
      (exists as any).mockResolvedValue(false);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      service.setModsPath('/mods');

      const result = await service.clearLogs();

      expect(result).toBe(false);
    });

    it('should use modsPathOverride when provided', async () => {
      (exists as any).mockResolvedValue(true);
      (readDir as any).mockResolvedValue([]);

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();

      await service.clearLogs('/override/mods');

      // Should have attempted to check the override path
      expect(exists).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      (exists as any).mockResolvedValue(true);
      (readDir as any).mockRejectedValue(new Error('Read error'));

      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();
      service.setModsPath('/mods');

      const result = await service.clearLogs();

      expect(result).toBe(false);
    });
  });

  describe('setModsPath', () => {
    it('should set the mods path', async () => {
      const { GameLogService } = await import(
        '@/lib/services/GameLogService'
      );
      const service = new GameLogService();

      service.setModsPath('/new/mods/path');

      expect((service as any).modsPath).toBe('/new/mods/path');
    });
  });
});
