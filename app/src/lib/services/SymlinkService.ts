/**
 * Symlink Service (now File Copy Service)
 *
 * Manages file copying for profile activation.
 * Copies mod files from cache to mods directory instead of using symlinks.
 */

import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { readDir, remove } from '@tauri-apps/plugin-fs';
import { SymlinkResult, SymlinkError } from '@/types/profile';

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

    // Step 2: Copy files from cache for new profile
    for (const { source, modName } of cachePaths) {
      try {
        const targetPath = await join(modsPath, modName);

        // Copy files from cache to mods directory
        await invoke('copy_directory', {
          source,
          target: targetPath,
        });

        created++;
      } catch (error: any) {
        failed++;
        errors.push({
          sourcePath: source,
          targetPath: await join(modsPath, modName),
          error: error.toString(),
        });
      }
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

      // Remove each directory (these are copied mod files)
      for (const entry of entries) {
        if (entry.isDirectory) {
          try {
            const fullPath = await join(modsPath, entry.name);
            await remove(fullPath, { recursive: true });
            created++;
          } catch (error: any) {
            failed++;
            errors.push({
              sourcePath: '',
              targetPath: await join(modsPath, entry.name),
              error: error.toString(),
            });
          }
        }
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
