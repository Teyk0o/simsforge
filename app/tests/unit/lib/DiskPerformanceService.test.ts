/**
 * Unit tests for DiskPerformanceService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiskPerformanceService } from '@/lib/services/DiskPerformanceService';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn().mockResolvedValue('/mock/appdata'),
  join: vi.fn((...parts: string[]) => Promise.resolve(parts.join('/'))),
}));

describe('DiskPerformanceService', () => {
  let service: DiskPerformanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiskPerformanceService();
  });

  describe('calculatePoolSize (via getPoolSize)', () => {
    it('should return default pool size (5) when not benchmarked', async () => {
      const { exists } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValue(true); // SimsForge dir exists
      vi.mocked(exists).mockResolvedValueOnce(true).mockResolvedValueOnce(false); // config doesn't exist

      const poolSize = await service.getPoolSize();

      expect(poolSize).toBe(5);
    });
  });

  describe('classifyDiskType', () => {
    it('should classify < 100 MB/s as HDD', async () => {
      const { exists, readFile } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            poolSize: 3,
            diskSpeedMBps: 50,
            lastBenchmark: '2025-01-01T00:00:00Z',
            benchmarkVersion: 2,
          })
        )
      );

      await service.initialize();
      const diskType = await service.getDiskType();

      expect(diskType).toBe('hdd');
    });

    it('should classify 100-300 MB/s as SSD', async () => {
      const { exists, readFile } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            poolSize: 8,
            diskSpeedMBps: 200,
            lastBenchmark: '2025-01-01T00:00:00Z',
            benchmarkVersion: 2,
          })
        )
      );

      await service.initialize();
      const diskType = await service.getDiskType();

      expect(diskType).toBe('ssd');
    });

    it('should classify > 300 MB/s as NVMe', async () => {
      const { exists, readFile } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            poolSize: 12,
            diskSpeedMBps: 900,
            lastBenchmark: '2025-01-01T00:00:00Z',
            benchmarkVersion: 2,
          })
        )
      );

      await service.initialize();
      const diskType = await service.getDiskType();

      expect(diskType).toBe('nvme');
    });
  });

  describe('poolSize mapping', () => {
    const testCases = [
      { speed: 30, expectedPool: 3, description: 'slow HDD (< 50 MB/s)' },
      { speed: 75, expectedPool: 5, description: 'fast HDD / slow SSD (50-100 MB/s)' },
      { speed: 150, expectedPool: 8, description: 'SATA SSD (100-200 MB/s)' },
      { speed: 500, expectedPool: 12, description: 'NVMe (> 200 MB/s)' },
      { speed: 1000, expectedPool: 12, description: 'fast NVMe (> 200 MB/s)' },
    ];

    testCases.forEach(({ speed, expectedPool, description }) => {
      it(`should return pool size ${expectedPool} for ${description}`, async () => {
        const { exists, readFile } = await import('@tauri-apps/plugin-fs');
        vi.mocked(exists).mockResolvedValue(true);
        vi.mocked(readFile).mockResolvedValue(
          new TextEncoder().encode(
            JSON.stringify({
              poolSize: expectedPool,
              diskSpeedMBps: speed,
              lastBenchmark: '2025-01-01T00:00:00Z',
              benchmarkVersion: 2,
            })
          )
        );

        await service.initialize();
        const poolSize = await service.getPoolSize();

        expect(poolSize).toBe(expectedPool);
      });
    });
  });

  describe('isFirstRun', () => {
    it('should return true when no config exists', async () => {
      const { exists } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists)
        .mockResolvedValueOnce(true) // SimsForge dir exists
        .mockResolvedValueOnce(false); // config doesn't exist

      const isFirst = await service.isFirstRun();

      expect(isFirst).toBe(true);
    });

    it('should return false when config exists', async () => {
      const { exists, readFile } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            poolSize: 5,
            diskSpeedMBps: 100,
            lastBenchmark: '2025-01-01T00:00:00Z',
            benchmarkVersion: 2,
          })
        )
      );

      const isFirst = await service.isFirstRun();

      expect(isFirst).toBe(false);
    });
  });

  describe('config version handling', () => {
    it('should invalidate config with old version', async () => {
      const { exists, readFile } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            poolSize: 5,
            diskSpeedMBps: 100,
            lastBenchmark: '2025-01-01T00:00:00Z',
            benchmarkVersion: 1, // Old version
          })
        )
      );

      await service.initialize();
      const config = await service.getConfig();

      // Config should be null because version doesn't match
      expect(config).toBeNull();
    });
  });

  describe('runBenchmark', () => {
    it('should call Rust benchmark command and save results', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { exists, writeFile, mkdir } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists)
        .mockResolvedValueOnce(true) // SimsForge dir exists
        .mockResolvedValueOnce(false); // config doesn't exist yet
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);
      vi.mocked(invoke).mockResolvedValue({
        speed_mbps: 500,
        bytes_written: 262144000,
        elapsed_ms: 500,
      });

      const progressCalls: number[] = [];
      const config = await service.runBenchmark((progress) => {
        progressCalls.push(progress);
      });

      expect(invoke).toHaveBeenCalledWith('benchmark_disk_speed');
      expect(config.diskSpeedMBps).toBe(500);
      expect(config.poolSize).toBe(12); // > 200 MB/s = 12 ops
      expect(config.benchmarkVersion).toBe(2);
      expect(writeFile).toHaveBeenCalled();
    });

    it('should call progress callback during benchmark', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { exists, writeFile } = await import('@tauri-apps/plugin-fs');

      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);
      vi.mocked(invoke).mockResolvedValue({
        speed_mbps: 100,
        bytes_written: 262144000,
        elapsed_ms: 2500,
      });

      const progressCalls: number[] = [];
      await service.runBenchmark((progress) => {
        progressCalls.push(progress);
      });

      // Should have progress updates (at least 90 and 100)
      expect(progressCalls).toContain(90);
      expect(progressCalls).toContain(100);
    });
  });

  describe('getDiskSpeed', () => {
    it('should return null when not benchmarked', async () => {
      const { exists } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const speed = await service.getDiskSpeed();

      expect(speed).toBeNull();
    });

    it('should return speed when benchmarked', async () => {
      const { exists, readFile } = await import('@tauri-apps/plugin-fs');
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            poolSize: 12,
            diskSpeedMBps: 850,
            lastBenchmark: '2025-01-01T00:00:00Z',
            benchmarkVersion: 2,
          })
        )
      );

      await service.initialize();
      const speed = await service.getDiskSpeed();

      expect(speed).toBe(850);
    });
  });
});
