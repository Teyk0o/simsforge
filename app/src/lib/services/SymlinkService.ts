/**
 * Symlink Service (now File Copy Service)
 *
 * Manages file copying for profile activation.
 * Copies mod files from cache to mods directory instead of using symlinks.
 * Uses parallel operations with auto-detected concurrency for optimal performance.
 */

import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { readDir, remove } from '@tauri-apps/plugin-fs';
import { SymlinkResult, SymlinkError } from '@/types/profile';
import { sanitizeModName } from '@/utils/pathSanitizer';
import { diskPerformanceService } from './DiskPerformanceService';
import {
  concurrentMap,
  getSuccessful,
  getFailed,
} from '@/lib/utils/concurrencyPool';

interface SymlinkPath {
  source: string;
  modName: string;
}

export class SymlinkService {
  /**
   * Activate profile by copying all mod files from cache to mods directory
   * Removes old profile files before copying new ones
   */
  async activateProfile(
    modsPath: string,
    cachePaths: SymlinkPath[]
  ): Promise<SymlinkResult> {
    const errors: SymlinkError[] = [];
    let created = 0;
    let failed = 0;

    // Step 1: Remove all existing profile mod files first (deactivate current)
    try {
      await this.deactivateProfile(modsPath);
    } catch (error) {
      console.error('Warning: Failed to deactivate profile:', error);
      // Don't fail here - we'll attempt to overwrite
    }

    // Step 2: Copy files from cache for new profile (parallel)
    const poolSize = await diskPerformanceService.getPoolSize();

    const results = await concurrentMap(
      cachePaths,
      async ({ source, modName }) => {
        const sanitizedName = sanitizeModName(modName);
        const targetPath = await join(modsPath, sanitizedName);

        await invoke('copy_directory', {
          source,
          target: targetPath,
        });

        return { source, modName, targetPath };
      },
      poolSize
    );

    // Process results
    const successful = getSuccessful(results);
    const failedResults = getFailed(results);

    created = successful.length;
    failed = failedResults.length;

    // Build error list from failed operations
    for (const { index, error } of failedResults) {
      const { source, modName } = cachePaths[index];
      const sanitizedName = sanitizeModName(modName);
      errors.push({
        sourcePath: source,
        targetPath: await join(modsPath, sanitizedName),
        error: String(error),
      });
    }

    return {
      success: failed === 0,
      created,
      failed,
      errors,
    };
  }

  /**
   * Deactivate profile by removing all mod files from mods directory
   * Only removes directories that are copied from cache (not user files)
   */
  async deactivateProfile(modsPath: string): Promise<SymlinkResult> {
    const errors: SymlinkError[] = [];
    let created = 0;
    let failed = 0;

    try {
      // List all entries in mods directory
      const entries = await readDir(modsPath);

      // Filter to directories only
      const directories = entries.filter((e) => e.isDirectory);

      if (directories.length === 0) {
        return { success: true, created: 0, failed: 0, errors: [] };
      }

      // Remove directories in parallel
      const poolSize = await diskPerformanceService.getPoolSize();

      const results = await concurrentMap(
        directories,
        async (entry) => {
          const fullPath = await join(modsPath, entry.name);
          await remove(fullPath, { recursive: true });
          return entry.name;
        },
        poolSize
      );

      // Process results
      const successful = getSuccessful(results);
      const failedResults = getFailed(results);

      created = successful.length;
      failed = failedResults.length;

      // Build error list from failed operations
      for (const { index, error } of failedResults) {
        const entry = directories[index];
        errors.push({
          sourcePath: '',
          targetPath: await join(modsPath, entry.name),
          error: String(error),
        });
      }
    } catch (error: any) {
      failed++;
      errors.push({
        sourcePath: '',
        targetPath: modsPath,
        error: `Failed to read mods directory: ${error.toString()}`,
      });
    }

    return {
      success: failed === 0,
      created,
      failed,
      errors,
    };
  }

  /**
   * Verify that mod files are correctly copied
   */
  async verifySymlinks(
    modsPath: string,
    expectedCount: number
  ): Promise<boolean> {
    try {
      const entries = await readDir(modsPath);
      const dirCount = entries.filter((e) => e.isDirectory).length;
      return dirCount === expectedCount;
    } catch (error) {
      console.error('Failed to verify mod files:', error);
      return false;
    }
  }

  /**
   * Get list of current mod directories in mods directory
   */
  async listSymlinks(modsPath: string): Promise<string[]> {
    try {
      const entries = await readDir(modsPath);
      const modDirs = await Promise.all(
        entries
          .filter((e) => e.isDirectory)
          .map((e) => join(modsPath, e.name))
      );

      return modDirs;
    } catch (error) {
      console.error('Failed to list mod directories:', error);
      return [];
    }
  }

  /**
   * Check if we can copy files (should always work)
   */
  async canCreateSymlinks(): Promise<boolean> {
    return true;
  }

  /**
   * Get permission help message (not needed for file copy)
   */
  getSymlinkPermissionFix(): {
    windows: string;
    unix: string;
  } {
    return {
      windows: 'Ensure you have write permissions to the Mods directory',
      unix: 'Ensure you have write permissions to the Mods directory',
    };
  }
}

// Export singleton instance
export const symlinkService = new SymlinkService();
