import { CurseForgeClient } from 'curseforge-api';

/**
 * Information about the latest version of a mod
 */
export interface LatestVersionInfo {
  modId: number;
  latestFileId: number;
  latestFileName: string;
  latestDisplayName: string;
  latestFileDate: string;
  latestFileSize: number;
}

/**
 * Response format for batch version check
 */
export interface BatchVersionResponse {
  [modId: number]: LatestVersionInfo;
}

/**
 * Service for checking mod versions in batch
 *
 * Provides efficient batch fetching of latest version information
 * for multiple mods.
 */
export class ModVersionService {
  private readonly MAX_BATCH_SIZE = 50; // CurseForge API limit

  /**
   * Get latest version information for multiple mods
   *
   * @param apiKey - CurseForge API key
   * @param modIds - Array of mod IDs to check
   * @returns Map of modId to latest version info
   *
   * @note Automatically handles batching for large mod lists
   */
  async getLatestVersions(
    apiKey: string,
    modIds: number[]
  ): Promise<BatchVersionResponse> {
    if (modIds.length === 0) {
      return {};
    }

    // Deduplicate mod IDs
    const uniqueModIds = [...new Set(modIds)];

    // Result map to collect responses
    const result: BatchVersionResponse = {};

    // Fetch mods in batches
    const client = new CurseForgeClient(apiKey);
    const batches = this.chunkArray(uniqueModIds, this.MAX_BATCH_SIZE);

    for (const batch of batches) {
      try {
        // Fetch mods in parallel for this batch
        const modPromises = batch.map((modId) =>
          client.getMod(modId).catch((error) => {
            console.warn(`Failed to fetch mod ${modId}:`, error.message);
            return null;
          })
        );

        const mods = await Promise.all(modPromises);

        // Process results
        for (const mod of mods) {
          if (!mod || !mod.latestFiles || mod.latestFiles.length === 0) {
            continue;
          }

          // Get the latest file (first in array, sorted by date by CurseForge)
          const latestFile = mod.latestFiles[0];

          const versionInfo: LatestVersionInfo = {
            modId: mod.id,
            latestFileId: latestFile.id,
            latestFileName: latestFile.fileName,
            latestDisplayName: latestFile.displayName || latestFile.fileName,
            latestFileDate: latestFile.fileDate
              ? new Date(latestFile.fileDate).toISOString()
              : new Date().toISOString(),
            latestFileSize: latestFile.fileLength || 0,
          };

          result[mod.id] = versionInfo;
        }
      } catch (error: any) {
        console.error('Batch version check failed:', error.message);
        // Continue with partial results
      }
    }

    return result;
  }

  /**
   * Check if a specific mod has an update available
   *
   * @param apiKey - CurseForge API key
   * @param modId - Mod ID to check
   * @param currentFileId - Currently installed file ID
   * @returns true if update available, false otherwise
   */
  async hasUpdate(
    apiKey: string,
    modId: number,
    currentFileId: number
  ): Promise<boolean> {
    const versions = await this.getLatestVersions(apiKey, [modId]);
    const latest = versions[modId];

    if (!latest) {
      return false;
    }

    return latest.latestFileId !== currentFileId;
  }

  /**
   * Split array into chunks of specified size
   * @private
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    return chunks;
  }
}

export const modVersionService = new ModVersionService();
