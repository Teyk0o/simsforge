/**
 * Backup Service
 *
 * Manages mod backups before updates. Creates timestamped backup copies
 * of mod files in the Backups directory within AppData.
 */

import {
  exists,
  mkdir,
  readDir,
  remove,
} from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { modCacheService } from './ModCacheService';
import type { ProfileMod } from '@/types/profile';

/**
 * Backup entry metadata
 */
export interface BackupEntry {
  modId: number;
  modName: string;
  versionId: number;
  versionNumber: string;
  fileHash: string;
  backupPath: string;
  createdAt: string;
}

/**
 * Backup result
 */
export interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
}

/**
 * Service for managing mod backups
 */
export class BackupService {
  private backupDir: string | null = null;
  private initialized = false;
  private readonly MAX_BACKUPS_PER_MOD = 3;

  /**
   * Initialize backup directory
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const appData = await appDataDir();
      this.backupDir = await join(appData, 'SimsForge', 'Backups');

      if (!(await exists(this.backupDir))) {
        await mkdir(this.backupDir, { recursive: true });
      }

      this.initialized = true;
    } catch (error) {
      console.error('[BackupService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Create a backup of a mod before update
   *
   * @param mod - The ProfileMod to backup
   * @returns BackupResult with backup path or error
   */
  async createBackup(mod: ProfileMod): Promise<BackupResult> {
    await this.ensureInitialized();

    try {
      // Get the cached mod files path
      await modCacheService.initialize();
      const cachePath = await modCacheService.getCachePath(mod.fileHash);

      if (!(await exists(cachePath))) {
        return {
          success: false,
          error: `Cache not found for mod: ${mod.modName}`,
        };
      }

      // Create backup directory for this mod
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${this.sanitizeName(mod.modName)}_v${mod.versionNumber}_${timestamp}`;
      const modBackupDir = await join(this.backupDir!, backupName);

      await mkdir(modBackupDir, { recursive: true });

      // Copy files from cache to backup
      await invoke('copy_directory', {
        source: cachePath,
        target: modBackupDir,
      });

      // Clean up old backups for this mod (keep only MAX_BACKUPS_PER_MOD)
      await this.cleanupOldBackups(mod.modId, mod.modName);

      console.log(`[BackupService] Created backup: ${modBackupDir}`);

      return {
        success: true,
        backupPath: modBackupDir,
      };
    } catch (error: any) {
      console.error('[BackupService] Failed to create backup:', error);
      return {
        success: false,
        error: error.message || 'Failed to create backup',
      };
    }
  }

  /**
   * Get all backups for a specific mod
   */
  async getBackupsForMod(modName: string): Promise<BackupEntry[]> {
    await this.ensureInitialized();

    try {
      const entries = await readDir(this.backupDir!);
      const sanitizedName = this.sanitizeName(modName);
      const backups: BackupEntry[] = [];

      for (const entry of entries) {
        if (entry.isDirectory && entry.name.startsWith(sanitizedName + '_v')) {
          // Parse backup name to extract info
          const parts = entry.name.split('_v');
          if (parts.length >= 2) {
            const backupPath = await join(this.backupDir!, entry.name);
            backups.push({
              modId: 0, // Would need to store metadata to get this
              modName: modName,
              versionId: 0,
              versionNumber: parts[1].split('_')[0] || 'unknown',
              fileHash: '',
              backupPath,
              createdAt: this.extractTimestampFromName(entry.name),
            });
          }
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return backups;
    } catch (error) {
      console.error('[BackupService] Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Get all backups
   */
  async getAllBackups(): Promise<BackupEntry[]> {
    await this.ensureInitialized();

    try {
      const entries = await readDir(this.backupDir!);
      const backups: BackupEntry[] = [];

      for (const entry of entries) {
        if (entry.isDirectory) {
          const backupPath = await join(this.backupDir!, entry.name);
          const parts = entry.name.split('_v');

          backups.push({
            modId: 0,
            modName: parts[0] || entry.name,
            versionId: 0,
            versionNumber: parts.length > 1 ? parts[1].split('_')[0] : 'unknown',
            fileHash: '',
            backupPath,
            createdAt: this.extractTimestampFromName(entry.name),
          });
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return backups;
    } catch (error) {
      console.error('[BackupService] Failed to get all backups:', error);
      return [];
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupPath: string): Promise<boolean> {
    try {
      if (await exists(backupPath)) {
        await remove(backupPath, { recursive: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[BackupService] Failed to delete backup:', error);
      return false;
    }
  }

  /**
   * Clear all backups
   */
  async clearAllBackups(): Promise<{ deleted: number; errors: number }> {
    await this.ensureInitialized();

    let deleted = 0;
    let errors = 0;

    try {
      const entries = await readDir(this.backupDir!);

      for (const entry of entries) {
        if (entry.isDirectory) {
          try {
            const fullPath = await join(this.backupDir!, entry.name);
            await remove(fullPath, { recursive: true });
            deleted++;
          } catch (error) {
            errors++;
            console.error(`[BackupService] Failed to delete ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[BackupService] Failed to clear backups:', error);
    }

    return { deleted, errors };
  }

  /**
   * Cleanup old backups for a mod, keeping only the most recent ones
   */
  private async cleanupOldBackups(modId: number, modName: string): Promise<void> {
    try {
      const backups = await this.getBackupsForMod(modName);

      // Remove old backups beyond the limit
      if (backups.length > this.MAX_BACKUPS_PER_MOD) {
        const toDelete = backups.slice(this.MAX_BACKUPS_PER_MOD);
        for (const backup of toDelete) {
          await this.deleteBackup(backup.backupPath);
          console.log(`[BackupService] Cleaned up old backup: ${backup.backupPath}`);
        }
      }
    } catch (error) {
      console.error('[BackupService] Failed to cleanup old backups:', error);
    }
  }

  /**
   * Sanitize mod name for use in file paths
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  /**
   * Extract timestamp from backup folder name
   */
  private extractTimestampFromName(name: string): string {
    // Format: ModName_vVersion_YYYY-MM-DDTHH-MM-SS-sssZ
    const match = name.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z?)$/);
    if (match) {
      // Convert back to ISO format
      return match[1].replace(/-(\d{2})-(\d{2})-(\d{3})/, ':$1:$2.$3');
    }
    return new Date().toISOString();
  }

  /**
   * Get backup directory path
   */
  async getBackupDirectory(): Promise<string> {
    await this.ensureInitialized();
    return this.backupDir!;
  }
}

// Export singleton instance
export const backupService = new BackupService();
