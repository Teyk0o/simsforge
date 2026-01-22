/**
 * Update System Types
 *
 * Type definitions for the automatic mod update detection
 * and batch update system.
 */

/**
 * Information about an available update for a mod
 */
export interface UpdateInfo {
  modId: number;
  modName: string;
  currentVersionId: number;
  currentVersionName: string;
  latestVersionId: number;
  latestVersionName: string;
  latestFileName: string;
  latestFileSize: number;
  checkedAt: string;
}

/**
 * Persisted update state stored in JSON file
 */
export interface UpdateState {
  version: string;
  lastCheckTimestamp: string;
  availableUpdates: Record<number, UpdateInfo>;
}

/**
 * Response from backend batch version check endpoint
 */
export interface BatchVersionResponse {
  [modId: number]: {
    modId: number;
    latestFileId: number;
    latestFileName: string;
    latestDisplayName: string;
    latestFileDate: string;
    latestFileSize: number;
  };
}

/**
 * Result of checking for updates
 */
export interface UpdateCheckResult {
  checkedCount: number;
  updatesFound: number;
  updates: UpdateInfo[];
  errors: string[];
}

/**
 * Result of a single mod update operation
 */
export interface ModUpdateResult {
  modId: number;
  modName: string;
  success: boolean;
  error?: string;
}

/**
 * Result of a batch update operation
 */
export interface BatchUpdateResult {
  successful: number;
  failed: number;
  results: ModUpdateResult[];
}

/**
 * Progress callback for update operations
 */
export interface UpdateProgressCallback {
  (progress: {
    currentMod: string;
    currentIndex: number;
    totalCount: number;
    stage: 'downloading' | 'installing' | 'complete' | 'error';
    percent: number;
  }): void;
}
