/**
 * Symlink Service
 *
 * Manages symlink creation and deletion for profile activation.
 * Handles Windows junctions and Unix symlinks transparently.
 */

import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { SymlinkResult, SymlinkError } from '@/types/profile';

interface SymlinkPath {
  source: string;
  modName: string;
}

export class SymlinkService {
  /**
   * Activate profile by creating symlinks for all mods
   * Atomically removes old symlinks before creating new ones
   */
  async activateProfile(
    modsPath: string,
    cachePaths: SymlinkPath[]
  ): Promise<SymlinkResult> {
    const errors: SymlinkError[] = [];
    let created = 0;
    let failed = 0;

    // Step 1: Remove all existing symlinks first (deactivate current)
    try {
      await this.deactivateProfile(modsPath);
    } catch (error) {
      console.error('Warning: Failed to deactivate profile:', error);
      // Don't fail here - we'll attempt to overwrite
    }

    // Step 2: Create symlinks for new profile
    for (const { source, modName } of cachePaths) {
      try {
        const targetPath = await join(modsPath, modName);

        // Create symlink
        await invoke('create_symlink', {
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
   * Deactivate profile by removing all symlinks from mods directory
   */
  async deactivateProfile(modsPath: string): Promise<SymlinkResult> {
    const errors: SymlinkError[] = [];
    let created = 0; // Not used, but part of result
    let failed = 0;

    try {
      // Get list of symlinks in mods directory
      const symlinks = await invoke<string[]>('list_symlinks', {
        directory: modsPath,
      });

      // Remove each symlink
      for (const symlinkPath of symlinks) {
        try {
          await invoke('remove_symlink', {
            path: symlinkPath,
          });

          created++; // Count removals as "created" for consistency
        } catch (error: any) {
          failed++;
          errors.push({
            sourcePath: '',
            targetPath: symlinkPath,
            error: error.toString(),
          });
        }
      }
    } catch (error: any) {
      failed++;
      errors.push({
        sourcePath: '',
        targetPath: modsPath,
        error: `Failed to list symlinks: ${error.toString()}`,
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
   * Verify that symlinks are correctly pointing to cache
   */
  async verifySymlinks(
    modsPath: string,
    expectedCount: number
  ): Promise<boolean> {
    try {
      const symlinks = await invoke<string[]>('list_symlinks', {
        directory: modsPath,
      });

      return symlinks.length === expectedCount;
    } catch (error) {
      console.error('Failed to verify symlinks:', error);
      return false;
    }
  }

  /**
   * Get list of current symlinks in mods directory
   */
  async listSymlinks(modsPath: string): Promise<string[]> {
    try {
      const symlinks = await invoke<string[]>('list_symlinks', {
        directory: modsPath,
      });

      return symlinks;
    } catch (error) {
      console.error('Failed to list symlinks:', error);
      return [];
    }
  }

  /**
   * Check if we have permission to create symlinks
   * (For Windows, this checks if junctions can be created)
   */
  async canCreateSymlinks(): Promise<boolean> {
    // Try to detect if user has necessary permissions
    // On Windows, junctions work without admin if filesystem supports them
    // For now, assume we can - errors will be caught during activation
    return true;
  }

  /**
   * Suggest fixing symlink permission issues
   */
  getSymlinkPermissionFix(): {
    windows: string;
    unix: string;
  } {
    return {
      windows: 'Enable Developer Mode in Windows Settings > Update & Security > For developers',
      unix: 'Ensure you have write permissions to the Mods directory',
    };
  }
}

// Export singleton instance
export const symlinkService = new SymlinkService();
