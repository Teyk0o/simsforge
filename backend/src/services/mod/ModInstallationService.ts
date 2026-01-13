/**
 * Mod Installation Service
 *
 * Handles downloading and installing mods from CurseForge
 * to the user's local mods directory
 */

import { CurseForgeClient } from 'curseforge-api';
import { userApiKeyRepository } from '@repositories/UserApiKeyRepository';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Extract } from 'unzipper';

/**
 * Options for installing a mod
 */
export interface InstallModOptions {
  userId: number;
  modId: number;
  modsPath: string;
  fileId?: number; // Optional: install specific file version
}

/**
 * Installation result with details
 */
export interface InstallationResult {
  success: boolean;
  modName: string;
  filesInstalled: string[];
  error?: string;
}

/**
 * Service for downloading and installing mods
 */
export class ModInstallationService {
  private readonly TEMP_DIR = path.join(process.cwd(), 'temp', 'downloads');

  constructor() {
    // Ensure temp directory exists
    if (!fs.existsSync(this.TEMP_DIR)) {
      fs.mkdirSync(this.TEMP_DIR, { recursive: true });
    }
  }

  /**
   * Install a mod from CurseForge to local mods directory
   *
   * @param options Installation options
   * @returns Installation result
   */
  async installMod(options: InstallModOptions): Promise<InstallationResult> {
    const { userId, modId, modsPath, fileId } = options;

    try {
      // Get API key
      const apiKey = await userApiKeyRepository.findByUserAndService(userId, 'curseforge');
      if (!apiKey) {
        throw new Error('CurseForge API key not configured');
      }

      // Validate mods path
      if (!fs.existsSync(modsPath)) {
        throw new Error(`Mods directory not found: ${modsPath}`);
      }

      // Get mod details
      const client = new CurseForgeClient(apiKey);
      const mod = await client.getMod(modId);

      // Determine which file to download
      let fileToDownload;
      if (fileId) {
        // Download specific file version
        fileToDownload = await client.getModFile(modId, fileId);
      } else {
        // Download latest file
        if (!mod.latestFiles || mod.latestFiles.length === 0) {
          throw new Error('No files available for this mod');
        }
        fileToDownload = mod.latestFiles[0];
      }

      // Download the file
      const downloadUrl = fileToDownload.downloadUrl;
      if (!downloadUrl) {
        throw new Error('Download URL not available for this file');
      }

      const tempFilePath = path.join(this.TEMP_DIR, `${modId}_${fileToDownload.id}${path.extname(fileToDownload.fileName)}`);
      await this.downloadFile(downloadUrl, tempFilePath);

      // Install the mod (extract if zip, copy if package)
      const installedFiles = await this.installModFiles(tempFilePath, modsPath, mod.name);

      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      return {
        success: true,
        modName: mod.name,
        filesInstalled: installedFiles,
      };
    } catch (error: any) {
      return {
        success: false,
        modName: 'Unknown',
        filesInstalled: [],
        error: error.message || 'Failed to install mod',
      };
    }
  }

  /**
   * Download a file from URL to local path
   *
   * @param url File URL
   * @param destination Local file path
   */
  private async downloadFile(url: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.downloadFile(redirectUrl, destination).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: HTTP ${response.statusCode}`));
          return;
        }

        const fileStream = createWriteStream(destination);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlinkSync(destination);
          reject(err);
        });
      });

      request.on('error', reject);
    });
  }

  /**
   * Install mod files to mods directory
   * Extracts .zip files and copies .package files
   *
   * @param filePath Path to downloaded file
   * @param modsPath User's mods directory
   * @param modName Name of the mod (for subfolder)
   * @returns List of installed file paths
   */
  private async installModFiles(filePath: string, modsPath: string, modName: string): Promise<string[]> {
    const installedFiles: string[] = [];
    const ext = path.extname(filePath).toLowerCase();

    // Sanitize mod name for folder name
    const sanitizedModName = modName.replace(/[^a-z0-9_-]/gi, '_');
    const modFolder = path.join(modsPath, sanitizedModName);

    // Create mod subfolder if it doesn't exist
    if (!fs.existsSync(modFolder)) {
      fs.mkdirSync(modFolder, { recursive: true });
    }

    if (ext === '.zip') {
      // Extract zip file
      await this.extractZip(filePath, modFolder);

      // Find all .package files in extracted content
      const packageFiles = this.findPackageFiles(modFolder);
      installedFiles.push(...packageFiles);
    } else if (ext === '.package') {
      // Copy .package file directly
      const destPath = path.join(modFolder, path.basename(filePath));
      fs.copyFileSync(filePath, destPath);
      installedFiles.push(destPath);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    return installedFiles;
  }

  /**
   * Extract a zip file to destination directory
   *
   * @param zipPath Path to zip file
   * @param destDir Destination directory
   */
  private async extractZip(zipPath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      createReadStream(zipPath)
        .pipe(Extract({ path: destDir }))
        .on('close', resolve)
        .on('error', reject);
    });
  }

  /**
   * Recursively find all .package files in a directory
   *
   * @param dir Directory to search
   * @returns Array of .package file paths
   */
  private findPackageFiles(dir: string): string[] {
    const results: string[] = [];

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        results.push(...this.findPackageFiles(filePath));
      } else if (path.extname(file).toLowerCase() === '.package') {
        results.push(filePath);
      }
    }

    return results;
  }

  /**
   * Clean up old temporary download files
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const files = fs.readdirSync(this.TEMP_DIR);
      for (const file of files) {
        const filePath = path.join(this.TEMP_DIR, file);
        const stat = fs.statSync(filePath);

        // Delete files older than 1 hour
        const now = Date.now();
        const fileAge = now - stat.mtimeMs;
        if (fileAge > 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      // Silently fail cleanup
      console.error('Failed to cleanup temp files:', error);
    }
  }
}

export const modInstallationService = new ModInstallationService();
