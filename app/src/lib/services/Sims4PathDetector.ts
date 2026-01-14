/**
 * Sims 4 Path Detector
 *
 * Auto-detects Sims 4 installation path and mods folder.
 * Supports multiple installation locations (Origin, Steam, EA App).
 */

import { exists } from '@tauri-apps/plugin-fs';
import { join, documentDir } from '@tauri-apps/api/path';
import { Sims4Paths, Sims4PathValidation } from '@/types/profile';

export class Sims4PathDetector {
  /**
   * Detect Sims 4 installation paths (game and mods folder)
   */
  async detectPaths(): Promise<Sims4Paths> {
    const gamePath = await this.detectGamePath();
    const modsPath = await this.detectModsPath();

    return { gamePath, modsPath };
  }

  /**
   * Detect game executable path across common installation locations
   */
  private async detectGamePath(): Promise<string | null> {
    // Common installation paths for Windows
    const commonPaths = [
      'C:\\Program Files\\EA Games\\The Sims 4\\Game\\Bin\\TS4_x64.exe',
      'C:\\Program Files (x86)\\Origin Games\\The Sims 4\\Game\\Bin\\TS4_x64.exe',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\The Sims 4\\Game\\Bin\\TS4_x64.exe',
      'D:\\Origin Games\\The Sims 4\\Game\\Bin\\TS4_x64.exe',
      'E:\\Origin Games\\The Sims 4\\Game\\Bin\\TS4_x64.exe',
      'C:\\Games\\The Sims 4\\Game\\Bin\\TS4_x64.exe', // Custom install
    ];

    for (const path of commonPaths) {
      if (await exists(path)) {
        return path;
      }
    }

    // TODO: Add Windows Registry lookup for EA App and Origin
    // HKEY_LOCAL_MACHINE\SOFTWARE\Electronic Arts\EA Games\The Sims 4
    // or check EA App installation paths

    return null;
  }

  /**
   * Detect mods folder path (usually in Documents)
   */
  private async detectModsPath(): Promise<string | null> {
    try {
      // Get user's Documents folder
      const documentsDir = await documentDir();
      const modsPath = await join(
        documentsDir,
        'Electronic Arts',
        'The Sims 4',
        'Mods'
      );

      if (await exists(modsPath)) {
        return modsPath;
      }

      // Try alternative: just "Mods" folder
      const altModsPath = await join(
        documentsDir,
        'The Sims 4',
        'Mods'
      );

      if (await exists(altModsPath)) {
        return altModsPath;
      }
    } catch (error) {
      console.error('Failed to detect mods path:', error);
    }

    return null;
  }

  /**
   * Validate that paths exist and are accessible
   */
  async validatePaths(paths: Sims4Paths): Promise<Sims4PathValidation> {
    const gameValid = paths.gamePath
      ? await exists(paths.gamePath)
      : false;
    const modsValid = paths.modsPath
      ? await exists(paths.modsPath)
      : false;

    return { gameValid, modsValid };
  }

  /**
   * Get human-readable error messages for missing paths
   */
  getPathErrorMessage(validation: Sims4PathValidation): string {
    if (!validation.gameValid && !validation.modsValid) {
      return 'Could not find The Sims 4 installation or Mods folder. Please install The Sims 4 and run the game once to create the Mods folder.';
    }

    if (!validation.gameValid) {
      return 'Could not find The Sims 4 executable (TS4_x64.exe). Check your installation.';
    }

    if (!validation.modsValid) {
      return 'Could not find the Mods folder. Run The Sims 4 once to create it, or check your Documents\\Electronic Arts\\The Sims 4 folder.';
    }

    return 'Paths are valid.';
  }

  /**
   * Get suggested paths if auto-detection fails
   */
  getSuggestedPaths(): string[] {
    if (typeof window === 'undefined') {
      return [];
    }

    return [
      'C:\\Program Files\\EA Games\\The Sims 4\\Game\\Bin\\TS4_x64.exe',
      'C:\\Program Files (x86)\\Origin Games\\The Sims 4\\Game\\Bin\\TS4_x64.exe',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\The Sims 4\\Game\\Bin\\TS4_x64.exe',
    ];
  }
}

// Export singleton instance
export const sims4PathDetector = new Sims4PathDetector();
