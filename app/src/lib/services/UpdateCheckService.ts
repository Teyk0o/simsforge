/**
 * Update Check Service
 *
 * Manages mod update detection by comparing installed versions
 * against the latest versions from CurseForge API.
 * Persists update state to JSON file for cross-session tracking.
 */

import {
  writeFile,
  readFile,
  exists,
  mkdir,
} from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { checkModVersions } from '@/lib/curseforgeApi';
import type { ProfileMod } from '@/types/profile';
import type {
  UpdateState,
  UpdateInfo,
  UpdateCheckResult,
} from '@/types/updates';

/**
 * Check if running inside Tauri desktop app
 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Default empty update state
 */
const DEFAULT_UPDATE_STATE: UpdateState = {
  version: '1.0.0',
  lastCheckTimestamp: '',
  availableUpdates: {},
};

/**
 * Service for checking and tracking mod updates
 */
export class UpdateCheckService {
  private updateStatePath: string | null = null;
  private initialized = false;

  /**
   * Initialize service and ensure directories exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Skip initialization if not running in Tauri
    if (!isTauri()) {
      console.warn('[UpdateCheckService] Not running in Tauri, skipping file persistence');
      this.initialized = true;
      return;
    }

    try {
      const appData = await appDataDir();
      const simsForgeDir = await join(appData, 'SimsForge');
      this.updateStatePath = await join(simsForgeDir, 'updates.json');

      if (!(await exists(simsForgeDir))) {
        await mkdir(simsForgeDir, { recursive: true });
      }

      // Mark as initialized BEFORE saving to avoid recursion
      this.initialized = true;

      // Initialize state file if not exists
      if (!(await exists(this.updateStatePath))) {
        await writeFile(
          this.updateStatePath,
          new TextEncoder().encode(JSON.stringify(DEFAULT_UPDATE_STATE, null, 2))
        );
      }
    } catch (error) {
      console.error('[UpdateCheckService] initialize() error:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Ensure service is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Check for updates for all mods in the provided list
   *
   * @param profileMods - Array of installed mods to check
   * @returns Result containing found updates and any errors
   */
  async checkForUpdates(profileMods: ProfileMod[]): Promise<UpdateCheckResult> {
    await this.ensureInitialized();

    const result: UpdateCheckResult = {
      checkedCount: 0,
      updatesFound: 0,
      updates: [],
      errors: [],
    };

    if (profileMods.length === 0) {
      return result;
    }

    try {
      // Extract mod IDs to check
      const modIds = profileMods
        .filter((mod) => mod.modId > 0)
        .map((mod) => mod.modId);

      if (modIds.length === 0) {
        return result;
      }

      // Fetch latest versions from backend
      const latestVersions = await checkModVersions(modIds);
      result.checkedCount = modIds.length;

      // Compare versions and find updates
      const updates: UpdateInfo[] = [];

      for (const mod of profileMods) {
        const latest = latestVersions[mod.modId];

        if (!latest) {
          continue;
        }

        // Compare file IDs - if different, update is available
        if (latest.latestFileId !== mod.versionId) {
          const updateInfo: UpdateInfo = {
            modId: mod.modId,
            modName: mod.modName,
            currentVersionId: mod.versionId,
            currentVersionName: mod.versionNumber,
            latestVersionId: latest.latestFileId,
            latestVersionName: latest.latestDisplayName,
            latestFileName: latest.latestFileName,
            latestFileSize: latest.latestFileSize,
            checkedAt: new Date().toISOString(),
          };

          updates.push(updateInfo);
        }
      }

      result.updatesFound = updates.length;
      result.updates = updates;

      // Persist update state
      const state = await this.getUpdateState();
      state.lastCheckTimestamp = new Date().toISOString();

      // Update the available updates map
      for (const update of updates) {
        state.availableUpdates[update.modId] = update;
      }

      // Remove updates for mods that are now up-to-date
      for (const modId of Object.keys(state.availableUpdates)) {
        const mod = profileMods.find((m) => m.modId === parseInt(modId));
        const latest = latestVersions[parseInt(modId)];

        if (mod && latest && mod.versionId === latest.latestFileId) {
          delete state.availableUpdates[parseInt(modId)];
        }
      }

      await this.saveUpdateState(state);

      return result;
    } catch (error: any) {
      console.error('[UpdateCheckService] checkForUpdates error:', error);
      result.errors.push(error.message || 'Failed to check for updates');
      return result;
    }
  }

  /**
   * Get the current update state
   */
  async getUpdateState(): Promise<UpdateState> {
    await this.ensureInitialized();

    // Return default state if not in Tauri (no file persistence)
    if (!isTauri() || !this.updateStatePath) {
      return { ...DEFAULT_UPDATE_STATE };
    }

    try {
      if (!(await exists(this.updateStatePath))) {
        return { ...DEFAULT_UPDATE_STATE };
      }

      const content = await readFile(this.updateStatePath);
      const decoder = new TextDecoder();
      const state = JSON.parse(decoder.decode(content)) as UpdateState;

      // Validate structure
      if (!state.availableUpdates) {
        state.availableUpdates = {};
      }

      return state;
    } catch (error) {
      console.error('[UpdateCheckService] Failed to read update state:', error);
      return { ...DEFAULT_UPDATE_STATE };
    }
  }

  /**
   * Save update state to file
   */
  async saveUpdateState(state: UpdateState): Promise<void> {
    await this.ensureInitialized();

    // Skip saving if not in Tauri (no file persistence)
    if (!isTauri() || !this.updateStatePath) {
      return;
    }

    try {
      await writeFile(
        this.updateStatePath,
        new TextEncoder().encode(JSON.stringify(state, null, 2))
      );
    } catch (error) {
      console.error('[UpdateCheckService] Failed to save update state:', error);
      throw error;
    }
  }

  /**
   * Clear update info for a specific mod (after updating)
   *
   * @param modId - The mod ID to clear
   */
  async clearUpdateForMod(modId: number): Promise<void> {
    await this.ensureInitialized();

    const state = await this.getUpdateState();

    if (state.availableUpdates[modId]) {
      delete state.availableUpdates[modId];
      await this.saveUpdateState(state);
    }
  }

  /**
   * Clear all update info
   */
  async clearAllUpdates(): Promise<void> {
    await this.ensureInitialized();

    const state = await this.getUpdateState();
    state.availableUpdates = {};
    state.lastCheckTimestamp = '';
    await this.saveUpdateState(state);
  }

  /**
   * Get the number of available updates
   */
  async getUpdateCount(): Promise<number> {
    const state = await this.getUpdateState();
    return Object.keys(state.availableUpdates).length;
  }

  /**
   * Get available updates as an array
   */
  async getAvailableUpdates(): Promise<UpdateInfo[]> {
    const state = await this.getUpdateState();
    return Object.values(state.availableUpdates);
  }

  /**
   * Check if a specific mod has an update available
   */
  async hasUpdate(modId: number): Promise<boolean> {
    const state = await this.getUpdateState();
    return !!state.availableUpdates[modId];
  }

  /**
   * Get update info for a specific mod
   */
  async getUpdateForMod(modId: number): Promise<UpdateInfo | null> {
    const state = await this.getUpdateState();
    return state.availableUpdates[modId] || null;
  }
}

export const updateCheckService = new UpdateCheckService();
