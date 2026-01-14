// typescript
/**
 * Mod Installation Service (Tauri-based)
 *
 * Handles downloading and installing mods locally using Tauri APIs
 */

import { fetch } from '@tauri-apps/plugin-http';
import {
  writeFile,
  exists,
  mkdir,
  readDir,
  remove,
} from '@tauri-apps/plugin-fs';
import { getModDownloadUrl, getCurseForgeMod } from '@/lib/curseforgeApi';
import { join, basename } from '@tauri-apps/api/path';
import { modCacheService } from './ModCacheService';
import { profileService } from './ProfileService';
import { symlinkService } from './SymlinkService';
import type { ProfileMod } from '@/types/profile';

/**
 * Installation progress callback
 */
export type ProgressCallback = (progress: {
  stage: 'downloading' | 'extracting' | 'installing' | 'complete' | 'error';
  percent: number;
  message: string;
}) => void;

/**
 * Installation result
 */
export interface InstallationResult {
  success: boolean;
  modName: string;
  filesInstalled: string[];
  error?: string;
}

/**
 * Service for downloading and installing mods using Tauri
 */
export class ModInstallationService {
  /**
   * Download and install a mod from CurseForge
   */
  async installMod(
      modId: number,
      modsPath: string,
      onProgress?: ProgressCallback,
      fileId?: number
  ): Promise<InstallationResult> {
    // Declare timer variable outside try/catch so it can be cleared in finally
    let progressInterval: NodeJS.Timeout | null = null;

    try {
      onProgress?.({
        stage: 'downloading',
        percent: 0,
        message: 'Getting download URL...',
      });

      const downloadInfo = await getModDownloadUrl(modId, fileId);
      const { modName, fileName, downloadUrl, fileSize } = downloadInfo;

      // Get mod details for library display
      let modLogo: string | undefined;
      let modAuthors: string[] | undefined;
      let lastUpdateDate: string | undefined;
      let versionNumber: string = '1.0.0';

      try {
        const modDetails = await getCurseForgeMod(modId);
        modLogo = modDetails.logo || undefined;
        modAuthors = modDetails.authors?.map((author) => author.name);
        lastUpdateDate = modDetails.dateModified;

        // Get version from latest file if available
        if (modDetails.latestFiles && modDetails.latestFiles.length > 0) {
          versionNumber = modDetails.latestFiles[0].displayName || '1.0.0';
        }
      } catch (error) {
        console.warn('Failed to fetch mod details:', error);
        // Continue with defaults if fetch fails
      }

      const tempDir = await join(await this.getTempDir(), `mod_${modId}_${Date.now()}`);
      await mkdir(tempDir, { recursive: true });

      const tempFilePath = await join(tempDir, fileName);

      // Start smooth progress simulation during download
      const downloadStartTime = Date.now();
      let currentProgress = 5;

      const startProgressSimulation = () => {
        progressInterval = setInterval(() => {
          if (currentProgress < 65) {
            // Smooth acceleration curve: progress speeds up over time
            const elapsed = Date.now() - downloadStartTime;
            const estimatedProgress = 5 + Math.pow(elapsed / 15000, 0.8) * 60;
            currentProgress = Math.min(estimatedProgress, 65);

            onProgress?.({
              stage: 'downloading',
              percent: Math.floor(currentProgress),
              message: `Downloading ${fileName}...`,
            });
          }
        }, 200); // Update every 200ms for smooth animation
      };

      startProgressSimulation();

      // Use fetchWithRedirects to follow 3xx redirects (ex. 302) and return the final response + URL
      const { response, finalUrl } = await this.fetchWithRedirects(downloadUrl, {
        method: 'GET',
        connectTimeout: 60000,
        redirect: 'follow',
      }, 5);

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}: ${response.statusText}`);
      }

      const fileBytes = await response.bytes();

      // Stop progress simulation
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      onProgress?.({
        stage: 'downloading',
        percent: 70,
        message: `Downloaded ${fileName}`,
      });

      await writeFile(tempFilePath, fileBytes);

      onProgress?.({
        stage: 'installing',
        percent: 70,
        message: 'Installing mod files...',
      });

      const ext = fileName.toLowerCase().split('.').pop() || '';

      if (ext !== 'zip') {
        throw new Error(`Unsupported file format: ${ext}`);
      }

      onProgress?.({
        stage: 'installing',
        percent: 70,
        message: 'Adding to profile cache...',
      });

      // Initialize services
      await modCacheService.initialize();
      await profileService.initialize();

      // Get active profile
      const activeProfile = await profileService.getActiveProfile();
      if (!activeProfile) {
        throw new Error(
          'No active profile. Please create or activate a profile before installing mods.'
        );
      }

      // Add mod to cache (handles deduplication)
      const cachedMod = await modCacheService.addToCache(
        modId,
        fileName,
        tempFilePath,
        activeProfile.id
      );

      // Add mod to active profile
      const profileMod: ProfileMod = {
        modId,
        modName,
        versionId: fileId || 0,
        versionNumber,
        fileHash: cachedMod.fileHash,
        fileName,
        installDate: new Date().toISOString(),
        enabled: true,
        cacheLocation: cachedMod.fileHash,
        logo: modLogo,
        authors: modAuthors,
        lastUpdateDate,
      };

      await profileService.addModToProfile(activeProfile.id, profileMod);

      // If modsPath is provided, create symlink
      let installedFiles: string[] = [];
      if (modsPath && (await exists(modsPath))) {
        onProgress?.({
          stage: 'installing',
          percent: 85,
          message: 'Creating symlink to profile mods...',
        });

        const cachePath = await modCacheService.getCachePath(
          cachedMod.fileHash
        );
        const sanitizedModName = this.sanitizeModName(modName);

        const symlinkResult = await symlinkService.activateProfile(modsPath, [
          { source: cachePath, modName: sanitizedModName },
        ]);

        if (!symlinkResult.success) {
          console.warn('Failed to create symlink:', symlinkResult.errors);
          // Don't fail - mod is in cache and profile
        }

        installedFiles = cachedMod.files.map((f) => f.fileName);
      } else {
        // If modsPath not provided, just return the cached files
        installedFiles = cachedMod.files.map((f) => f.fileName);
      }

      await this.cleanupTempDir(tempDir);

      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: `${modName} installed successfully!`,
      });

      return {
        success: true,
        modName,
        filesInstalled: installedFiles,
      };
    } catch (error: any) {
      console.error('[ModInstallationService] Installation error:', error);

      onProgress?.({
        stage: 'error',
        percent: 0,
        message: error.message || 'Installation failed',
      });

      return {
        success: false,
        modName: 'Unknown',
        filesInstalled: [],
        error: error.message || 'Installation failed',
      };
    } finally {
      // Ensure timer is always cleared
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  }

  /**
   * Helper: fetch and follow 3xx redirects up to maxRedirects.
   * Retourne l'objet response final et l'URL finale suivie.
   */
  private async fetchWithRedirects(initialUrl: string, options: any = {}, maxRedirects = 5): Promise<{ response: any; finalUrl: string }> {
    let currentUrl = initialUrl;

    for (let i = 0; i <= maxRedirects; i++) {
      const resp = await fetch(currentUrl, options);

      if (resp.status >= 300 && resp.status < 400) {
        const headers: any = (resp as any).headers;
        let location =
            typeof headers?.get === 'function'
                ? headers.get('location')
                : headers?.location ?? headers?.['location'];

        if (!location) {
          throw new Error(`Redirected (${resp.status}) but no Location header found`);
        }

        // Resolve relative redirects against the current URL
        try {
          location = new URL(location, currentUrl).toString();
        } catch {
          // keep raw location if URL parsing fails
        }

        currentUrl = location;
        // continue the loop to fetch the new URL
        continue;
      }

      // not a redirect, return
      return { response: resp, finalUrl: currentUrl };
    }

    throw new Error('Too many redirects while trying to download file');
  }

  /**
   * Install a .zip mod file (extract and find .package files)
   */
  private async installZipMod(
      zipPath: string,
      modsPath: string,
      modName: string,
      onProgress?: ProgressCallback
  ): Promise<string[]> {
    const sanitizedModName = this.sanitizeModName(modName);
    const modFolder = await join(modsPath, sanitizedModName);

    if (!(await exists(modFolder))) {
      await mkdir(modFolder, { recursive: true });
    }

    onProgress?.({
      stage: 'extracting',
      percent: 75,
      message: 'Extracting files...',
    });

    const extractedFiles = await this.extractZip(zipPath, modFolder);

    const packageFiles = await this.findPackageFiles(modFolder);

    onProgress?.({
      stage: 'installing',
      percent: 90,
      message: `Installing ${packageFiles.length} files...`,
    });

    return packageFiles;
  }

  /**
   * Extract a zip file using Tauri invoke
   */
  private async extractZip(zipPath: string, destDir: string): Promise<void> {

    const { invoke } = await import('@tauri-apps/api/core');

    try {
      await invoke('extract_zip', {
        zipPath,
        destDir,
      });
    } catch (error) {
      console.error('[ModInstallationService] Failed to extract zip:', error);
      throw new Error(`Failed to extract zip: ${error}`);
    }
  }

  /**
   * Recursively find all .package files in a directory
   */
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

  /**
   * Sanitize mod name for folder name
   */
  private sanitizeModName(modName: string): string {
    return modName.replace(/[^a-z0-9_-]/gi, '_');
  }

  /**
   * Get temp directory for downloads
   */
  private async getTempDir(): Promise<string> {
    const { appDataDir } = await import('@tauri-apps/api/path');
    const appData = await appDataDir();
    return await join(appData, 'temp', 'downloads');
  }

  /**
   * Cleanup temp directory
   */
  private async cleanupTempDir(tempDir: string): Promise<void> {
    try {
      await remove(tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to cleanup temp dir:', error);
    }
  }
}

export const modInstallationService = new ModInstallationService();