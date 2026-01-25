/**
 * Log Enabler Service
 *
 * Manages the installation and removal of the Sims Log Enabler mod.
 * This mod enables real-time log viewing from The Sims 4.
 */

import { fetch } from '@tauri-apps/plugin-http';
import { writeFile, exists, remove, mkdir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { apiGet } from '@/lib/apiClient';

/**
 * Subfolder name for the Sims Log Enabler in the Mods directory
 */
const LOG_ENABLER_FOLDER = 'Sims_Log_Enabler';

/**
 * Metadata for a single file within the tool
 */
export interface LogEnablerFileMetadata {
  filename: string;
  hash: string;
  fileSize: number;
}

/**
 * Metadata for the Sims Log Enabler tool
 */
export interface LogEnablerMetadata {
  version: string;
  description: string;
  files: LogEnablerFileMetadata[];
}

/**
 * API response for tool metadata
 */
interface ToolMetadataResponse {
  success: boolean;
  data: LogEnablerMetadata;
}

/**
 * Backend URL for tools API
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * Tool ID for the Sims Log Enabler
 */
const TOOL_ID = 'sims-log-enabler';

/**
 * Service for managing the Sims Log Enabler mod
 */
export class LogEnablerService {
  /**
   * Get metadata for the Sims Log Enabler
   *
   * @returns Tool metadata including version and files list
   */
  async getMetadata(): Promise<LogEnablerMetadata> {
    const response = await apiGet<ToolMetadataResponse>(
      `/api/v1/tools/${TOOL_ID}/metadata`
    );

    if (!response.success) {
      throw new Error('Failed to fetch Log Enabler metadata');
    }

    return response.data;
  }

  /**
   * Check if the Sims Log Enabler is installed in the Mods folder
   *
   * @param modsPath - Path to The Sims 4 Mods folder
   * @returns True if all mod files exist
   */
  async isInstalled(modsPath: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata();
      const installDir = await join(modsPath, LOG_ENABLER_FOLDER);

      for (const file of metadata.files) {
        const filePath = await join(installDir, file.filename);
        const fileExists = await exists(filePath);
        if (!fileExists) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Install the Sims Log Enabler to the Mods folder
   * Downloads and installs all required files into a dedicated subfolder
   *
   * @param modsPath - Path to The Sims 4 Mods folder
   * @returns Result of the installation
   */
  async install(modsPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate mods path exists
      const modsExists = await exists(modsPath);
      if (!modsExists) {
        return {
          success: false,
          error: 'Mods folder not found. Please configure it in Settings.',
        };
      }

      // Get metadata to know which files to download
      const metadata = await this.getMetadata();

      // Create the subfolder for the Log Enabler
      const installDir = await join(modsPath, LOG_ENABLER_FOLDER);
      const installDirExists = await exists(installDir);
      if (!installDirExists) {
        await mkdir(installDir, { recursive: true });
      }

      // Download and install each file
      for (const file of metadata.files) {
        const downloadUrl = `${BACKEND_URL}/api/v1/tools/${TOOL_ID}/download/${encodeURIComponent(file.filename)}`;

        const response = await fetch(downloadUrl, {
          method: 'GET',
          connectTimeout: 30000,
        });

        if (!response.ok) {
          return {
            success: false,
            error: `Failed to download ${file.filename}: ${response.status} ${response.statusText}`,
          };
        }

        // Get file bytes
        const fileBytes = await response.bytes();

        // Write to the subfolder
        const destPath = await join(installDir, file.filename);
        await writeFile(destPath, fileBytes);

        console.log(`[LogEnablerService] Installed ${file.filename} to ${destPath}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('[LogEnablerService] Installation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to install Sims Log Enabler',
      };
    }
  }

  /**
   * Uninstall (remove) the Sims Log Enabler from the Mods folder
   * Removes the entire subfolder containing all files
   *
   * @param modsPath - Path to The Sims 4 Mods folder
   * @returns Result of the uninstallation
   */
  async uninstall(modsPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const installDir = await join(modsPath, LOG_ENABLER_FOLDER);

      // Check if the folder exists
      const folderExists = await exists(installDir);
      if (!folderExists) {
        // Nothing to uninstall
        return { success: true };
      }

      // Remove the entire folder
      await remove(installDir, { recursive: true });
      console.log(`[LogEnablerService] Removed folder ${installDir}`);

      return { success: true };
    } catch (error: any) {
      console.error('[LogEnablerService] Uninstallation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to uninstall Sims Log Enabler',
      };
    }
  }
}

// Export singleton instance
export const logEnablerService = new LogEnablerService();
