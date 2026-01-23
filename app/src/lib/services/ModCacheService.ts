/**
 * Mod Cache Service
 *
 * Manages centralized mod cache with hash-based deduplication.
 * Stores downloaded mods in AppData and tracks usage across profiles.
 */

import {
  writeFile,
  readFile,
  exists,
  mkdir,
  readDir,
  remove,
} from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import { join, basename } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import {
  CachedMod,
  CachedModFile,
  ModCacheIndex,
} from '@/types/profile';

export class ModCacheService {
  private cacheDir: string | null = null;
  private indexFile: string | null = null;
  private readonly CACHE_VERSION = '1.0.0';
  private initialized = false;

  /**
   * Initialize cache directory and index
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const appData = await appDataDir();
    this.cacheDir = await join(appData, 'SimsForge', 'ModsCache');
    this.indexFile = await join(this.cacheDir, 'cache.index.json');

    if (!(await exists(this.cacheDir))) {
      await mkdir(this.cacheDir, { recursive: true });
    }

    // Initialize index if not exists
    if (!(await exists(this.indexFile))) {
      const defaultIndex: ModCacheIndex = {
        version: this.CACHE_VERSION,
        entries: {},
        lastCleanup: new Date().toISOString(),
      };
      await this.saveIndex(defaultIndex);
    }

    this.initialized = true;
  }

  /**
   * Add mod to cache (called after download)
   * Returns cached mod info and checks for duplicates
   */
  async addToCache(
    modId: number,
    fileName: string,
    sourcePath: string,
    profileId: string
  ): Promise<CachedMod> {
    await this.ensureInitialized();

    // Calculate file hash
    const fileHash = await this.calculateFileHash(sourcePath);

    // Check if already cached
    const index = await this.getIndex();
    let cachedMod = index.entries[fileHash];

    if (cachedMod) {
      // File already cached - add profile to usage tracking
      if (!cachedMod.usedByProfiles.includes(profileId)) {
        cachedMod.usedByProfiles.push(profileId);
        index.entries[fileHash] = cachedMod;
        await this.saveIndex(index);
      }
      return cachedMod;
    }

    // Create new cache entry
    const cacheEntryDir = await join(this.cacheDir!, fileHash);
    const cacheFilesDir = await join(cacheEntryDir, 'files');
    await mkdir(cacheFilesDir, { recursive: true });

    // Extract mod to cache directory
    const extractedFiles = await this.extractModToCache(
      sourcePath,
      cacheFilesDir
    );

    // Get file size
    const fileSize = await this.getFileSize(sourcePath);

    // Create cached mod entry
    cachedMod = {
      fileHash,
      modId,
      fileName,
      fileSize,
      downloadedAt: new Date().toISOString(),
      usedByProfiles: [profileId],
      files: extractedFiles,
    };

    // Save metadata
    const metadataPath = await join(cacheEntryDir, 'metadata.json');
    await writeFile(
      metadataPath,
      new TextEncoder().encode(JSON.stringify(cachedMod, null, 2))
    );

    // Update index
    index.entries[fileHash] = cachedMod;
    await this.saveIndex(index);

    return cachedMod;
  }

  /**
   * Get cached mod by hash
   */
  async getCachedMod(fileHash: string): Promise<CachedMod | null> {
    await this.ensureInitialized();

    const index = await this.getIndex();
    return index.entries[fileHash] || null;
  }

  /**
   * Get cache directory path for a specific hash
   */
  async getCachePath(fileHash: string): Promise<string> {
    await this.ensureInitialized();
    return await join(this.cacheDir!, fileHash, 'files');
  }

  /**
   * Remove profile from cache usage tracking
   */
  async removeProfileFromCache(profileId: string): Promise<void> {
    await this.ensureInitialized();

    const index = await this.getIndex();
    let modified = false;

    const hashesToDelete: string[] = [];

    for (const [hash, entry] of Object.entries(index.entries)) {
      const profileIndex = entry.usedByProfiles.indexOf(profileId);
      if (profileIndex >= 0) {
        entry.usedByProfiles.splice(profileIndex, 1);
        modified = true;

        // Mark for deletion if no longer used
        if (entry.usedByProfiles.length === 0) {
          hashesToDelete.push(hash);
        }
      }
    }

    // Delete orphaned cache entries
    for (const hash of hashesToDelete) {
      await this.deleteCacheEntry(hash);
      delete index.entries[hash];
    }

    if (modified) {
      await this.saveIndex(index);
    }
  }

  /**
   * Cleanup orphaned cache entries (mods not used by any profile)
   */
  async cleanupOrphans(): Promise<{ deleted: number; freedBytes: number }> {
    await this.ensureInitialized();

    const index = await this.getIndex();
    let deleted = 0;
    let freedBytes = 0;

    const hashesToDelete: string[] = [];

    for (const [hash, entry] of Object.entries(index.entries)) {
      if (entry.usedByProfiles.length === 0) {
        freedBytes += entry.fileSize;
        hashesToDelete.push(hash);
        deleted++;
      }
    }

    // Delete orphaned entries
    for (const hash of hashesToDelete) {
      await this.deleteCacheEntry(hash);
      delete index.entries[hash];
    }

    if (deleted > 0) {
      index.lastCleanup = new Date().toISOString();
      await this.saveIndex(index);
    }

    return { deleted, freedBytes };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    totalMods: number;
    totalProfiles: Set<string>;
  }> {
    await this.ensureInitialized();

    const index = await this.getIndex();
    let totalSize = 0;
    const totalProfiles = new Set<string>();

    for (const entry of Object.values(index.entries)) {
      totalSize += entry.fileSize;
      entry.usedByProfiles.forEach((id) => totalProfiles.add(id));
    }

    return {
      totalSize,
      totalMods: Object.keys(index.entries).length,
      totalProfiles,
    };
  }

  // Helper methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async getIndex(): Promise<ModCacheIndex> {
    try {
      const content = await readFile(this.indexFile!);
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(content));
    } catch (error) {
      console.error('Failed to read cache index:', error);
      // Return empty index if corrupted
      return {
        version: this.CACHE_VERSION,
        entries: {},
        lastCleanup: new Date().toISOString(),
      };
    }
  }

  private async saveIndex(index: ModCacheIndex): Promise<void> {
    await writeFile(
      this.indexFile!,
      new TextEncoder().encode(JSON.stringify(index, null, 2))
    );
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    // Use Tauri command to calculate SHA-256 hash
    const hash = await invoke<string>('calculate_file_hash', {
      filePath,
    });
    return hash;
  }

  private async getFileSize(filePath: string): Promise<number> {
    // Use Tauri command to get file size
    const size = await invoke<number>('get_file_size', {
      filePath,
    });
    return size;
  }

  private async extractModToCache(
    sourcePath: string,
    destDir: string
  ): Promise<CachedModFile[]> {
    // Extract ZIP to cache directory
    try {
      await invoke('extract_zip', {
        zipPath: sourcePath,
        destDir,
      });
    } catch (error) {
      console.error('Failed to extract zip:', error);
      throw new Error(`Failed to extract mod: ${error}`);
    }

    // Find all .package files
    const packageFiles = await this.findPackageFiles(destDir);

    return packageFiles.map((filePath) => {
      // Calculate relative path from destDir
      const relativePath = filePath
        .substring(destDir.length)
        .replace(/^[\\\/]/, '');
      const fileName = filePath.split(/[\\\/]/).pop() || '';

      return {
        relativePath,
        fileName,
        fileSize: 0, // Size will be calculated if needed
      };
    });
  }

  private async findPackageFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await readDir(dir);

      for (const entry of entries) {
        const fullPath = await join(dir, entry.name);

        if (entry.isDirectory) {
          const subResults = await this.findPackageFiles(fullPath);
          results.push(...subResults);
        } else if (entry.name.endsWith('.package')) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      console.error('Error reading directory:', error);
    }

    return results;
  }

  private async deleteCacheEntry(fileHash: string): Promise<void> {
    const cacheEntryDir = await join(this.cacheDir!, fileHash);
    if (await exists(cacheEntryDir)) {
      try {
        await remove(cacheEntryDir, { recursive: true });
      } catch (error) {
        console.error(`Failed to delete cache entry ${fileHash}:`, error);
      }
    }
  }
}

// Export singleton instance
export const modCacheService = new ModCacheService();
