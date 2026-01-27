/**
 * Disk Performance Service
 *
 * Benchmarks disk speed at first launch to auto-detect optimal concurrency.
 * Uses Rust-side benchmark for accurate measurements without IPC overhead.
 * Stores configuration in AppData for persistence across sessions.
 */

import { invoke } from '@tauri-apps/api/core';
import {
  writeFile,
  readFile,
  exists,
  mkdir,
} from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

/**
 * Disk performance configuration stored in AppData
 */
export interface DiskPerformanceConfig {
  /** Optimal number of concurrent disk operations (3-12) */
  poolSize: number;
  /** Measured disk speed in MB/s */
  diskSpeedMBps: number;
  /** ISO date of last benchmark */
  lastBenchmark: string;
  /** Version for future recalibration */
  benchmarkVersion: number;
}

/**
 * Disk type classification based on speed
 */
export type DiskType = 'hdd' | 'ssd' | 'nvme';

/** Current benchmark algorithm version */
const BENCHMARK_VERSION = 2;

/** Default pool size if benchmark hasn't run */
const DEFAULT_POOL_SIZE = 5;

/**
 * Result from Rust benchmark command
 */
interface RustBenchmarkResult {
  speed_mbps: number;
  bytes_written: number;
  elapsed_ms: number;
}

/**
 * Service for auto-detecting optimal disk concurrency
 */
export class DiskPerformanceService {
  private configPath: string | null = null;
  private config: DiskPerformanceConfig | null = null;
  private initialized = false;

  /**
   * Initialize the service and load existing config if available.
   * Does NOT run benchmark automatically - call runBenchmark() or isFirstRun().
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const appData = await appDataDir();
      const simsForgeDir = await join(appData, 'SimsForge');
      this.configPath = await join(simsForgeDir, 'performance.json');

      // Ensure SimsForge directory exists
      if (!(await exists(simsForgeDir))) {
        await mkdir(simsForgeDir, { recursive: true });
      }

      // Load existing config if available
      if (await exists(this.configPath)) {
        await this.loadConfig();
      }

      this.initialized = true;
    } catch (error) {
      console.error('[DiskPerformanceService] initialize() error:', error);
      throw error;
    }
  }

  /**
   * Check if this is the first run (no benchmark has been performed).
   */
  async isFirstRun(): Promise<boolean> {
    await this.ensureInitialized();
    return this.config === null;
  }

  /**
   * Get the optimal pool size for concurrent disk operations.
   *
   * @returns Optimal concurrency (3-12), defaults to 5 if not benchmarked
   */
  async getPoolSize(): Promise<number> {
    await this.ensureInitialized();
    return this.config?.poolSize ?? DEFAULT_POOL_SIZE;
  }

  /**
   * Get the measured disk speed in MB/s.
   *
   * @returns Disk speed or null if not benchmarked
   */
  async getDiskSpeed(): Promise<number | null> {
    await this.ensureInitialized();
    return this.config?.diskSpeedMBps ?? null;
  }

  /**
   * Get the disk type classification based on measured speed.
   *
   * @returns Disk type or null if not benchmarked
   */
  async getDiskType(): Promise<DiskType | null> {
    await this.ensureInitialized();

    if (!this.config) {
      return null;
    }

    return this.classifyDiskType(this.config.diskSpeedMBps);
  }

  /**
   * Get the full performance configuration.
   *
   * @returns Configuration or null if not benchmarked
   */
  async getConfig(): Promise<DiskPerformanceConfig | null> {
    await this.ensureInitialized();
    return this.config;
  }

  /**
   * Run the disk benchmark using Rust for accurate measurements.
   *
   * @param onProgress - Optional progress callback (0-100)
   * @returns The new configuration
   */
  async runBenchmark(
    onProgress?: (percent: number) => void
  ): Promise<DiskPerformanceConfig> {
    await this.ensureInitialized();

    console.log('[DiskPerformanceService] Starting Rust benchmark...');

    try {
      // Animate progress smoothly while Rust benchmark runs
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if (currentProgress < 85) {
          currentProgress += 5;
          onProgress?.(currentProgress);
        }
      }, 100);

      // Call Rust benchmark command for accurate measurement
      const result = await invoke<RustBenchmarkResult>('benchmark_disk_speed');

      clearInterval(progressInterval);
      onProgress?.(90);

      const diskSpeedMBps = result.speed_mbps;

      console.log(
        `[DiskPerformanceService] Benchmark complete: ${diskSpeedMBps} MB/s (${result.bytes_written / (1024 * 1024)} MB in ${result.elapsed_ms} ms)`
      );

      // Calculate optimal pool size
      const poolSize = this.calculatePoolSize(diskSpeedMBps);

      // Create config
      const config: DiskPerformanceConfig = {
        poolSize,
        diskSpeedMBps,
        lastBenchmark: new Date().toISOString(),
        benchmarkVersion: BENCHMARK_VERSION,
      };

      // Save config
      await this.saveConfig(config);
      this.config = config;

      onProgress?.(100);

      return config;
    } catch (error) {
      console.error('[DiskPerformanceService] Benchmark failed:', error);
      throw error;
    }
  }

  /**
   * Force re-run the benchmark.
   */
  async rebenchmark(
    onProgress?: (percent: number) => void
  ): Promise<DiskPerformanceConfig> {
    return this.runBenchmark(onProgress);
  }

  /**
   * Calculate optimal pool size based on disk speed.
   *
   * Mapping:
   * - < 50 MB/s (HDD) -> 3 ops
   * - 50-100 MB/s (SATA SSD) -> 5 ops
   * - 100-200 MB/s (Fast SSD) -> 8 ops
   * - > 200 MB/s (NVMe) -> 12 ops
   */
  private calculatePoolSize(speedMBps: number): number {
    if (speedMBps < 50) {
      return 3;
    } else if (speedMBps < 100) {
      return 5;
    } else if (speedMBps < 200) {
      return 8;
    } else {
      return 12;
    }
  }

  /**
   * Classify disk type based on speed.
   */
  private classifyDiskType(speedMBps: number): DiskType {
    if (speedMBps < 100) {
      return 'hdd';
    } else if (speedMBps < 300) {
      return 'ssd';
    } else {
      return 'nvme';
    }
  }

  /**
   * Load configuration from disk.
   */
  private async loadConfig(): Promise<void> {
    try {
      const content = await readFile(this.configPath!);
      const decoder = new TextDecoder();
      this.config = JSON.parse(decoder.decode(content));

      // Validate config version
      if (this.config && this.config.benchmarkVersion !== BENCHMARK_VERSION) {
        console.log(
          '[DiskPerformanceService] Config version mismatch, will re-benchmark'
        );
        this.config = null;
      }
    } catch (error) {
      console.error('[DiskPerformanceService] Failed to load config:', error);
      this.config = null;
    }
  }

  /**
   * Save configuration to disk.
   */
  private async saveConfig(config: DiskPerformanceConfig): Promise<void> {
    await writeFile(
      this.configPath!,
      new TextEncoder().encode(JSON.stringify(config, null, 2))
    );
  }

  /**
   * Ensure the service is initialized.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const diskPerformanceService = new DiskPerformanceService();
