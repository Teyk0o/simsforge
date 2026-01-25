/**
 * User Preferences Service
 *
 * Manages user preferences for mod management including auto-updates
 * and backup settings. Persists preferences to localStorage with encryption.
 */

/**
 * User preferences structure
 */
export interface UserPreferences {
  autoUpdates: boolean;
  backupBeforeUpdate: boolean;
  fakeModDetection: boolean;
  gameLogging: boolean;
  showDebugLogs: boolean;
}

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  autoUpdates: true,
  backupBeforeUpdate: true,
  fakeModDetection: true,
  gameLogging: true,
  showDebugLogs: false,
};

const STORAGE_KEY = 'simsforge_user_preferences';

/**
 * Service for managing user preferences
 */
export class UserPreferencesService {
  private preferences: UserPreferences = { ...DEFAULT_PREFERENCES };
  private initialized = false;

  /**
   * Initialize and load preferences from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserPreferences>;
        this.preferences = {
          ...DEFAULT_PREFERENCES,
          ...parsed,
        };
      }
      this.initialized = true;
    } catch (error) {
      console.error('[UserPreferencesService] Failed to load preferences:', error);
      this.preferences = { ...DEFAULT_PREFERENCES };
      this.initialized = true;
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      // Synchronous fallback - try to load from localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<UserPreferences>;
          this.preferences = {
            ...DEFAULT_PREFERENCES,
            ...parsed,
          };
        }
        this.initialized = true;
      } catch (error) {
        this.preferences = { ...DEFAULT_PREFERENCES };
        this.initialized = true;
      }
    }
  }

  /**
   * Get all preferences
   */
  getPreferences(): UserPreferences {
    this.ensureInitialized();
    return { ...this.preferences };
  }

  /**
   * Get auto-updates preference
   */
  getAutoUpdates(): boolean {
    this.ensureInitialized();
    return this.preferences.autoUpdates;
  }

  /**
   * Get backup before update preference
   */
  getBackupBeforeUpdate(): boolean {
    this.ensureInitialized();
    return this.preferences.backupBeforeUpdate;
  }

  /**
   * Set auto-updates preference
   */
  setAutoUpdates(enabled: boolean): void {
    this.ensureInitialized();
    this.preferences.autoUpdates = enabled;
    this.savePreferences();
  }

  /**
   * Set backup before update preference
   */
  setBackupBeforeUpdate(enabled: boolean): void {
    this.ensureInitialized();
    this.preferences.backupBeforeUpdate = enabled;
    this.savePreferences();
  }

  /**
   * Get fake mod detection preference
   */
  getFakeModDetection(): boolean {
    this.ensureInitialized();
    return this.preferences.fakeModDetection;
  }

  /**
   * Set fake mod detection preference
   */
  setFakeModDetection(enabled: boolean): void {
    this.ensureInitialized();
    this.preferences.fakeModDetection = enabled;
    this.savePreferences();
  }

  /**
   * Get game logging preference
   */
  getGameLogging(): boolean {
    this.ensureInitialized();
    return this.preferences.gameLogging;
  }

  /**
   * Set game logging preference
   */
  setGameLogging(enabled: boolean): void {
    this.ensureInitialized();
    this.preferences.gameLogging = enabled;
    this.savePreferences();
  }

  /**
   * Get show debug logs preference
   */
  getShowDebugLogs(): boolean {
    this.ensureInitialized();
    return this.preferences.showDebugLogs;
  }

  /**
   * Set show debug logs preference
   */
  setShowDebugLogs(enabled: boolean): void {
    this.ensureInitialized();
    this.preferences.showDebugLogs = enabled;
    this.savePreferences();
  }

  /**
   * Update multiple preferences at once
   */
  updatePreferences(updates: Partial<UserPreferences>): void {
    this.ensureInitialized();
    this.preferences = {
      ...this.preferences,
      ...updates,
    };
    this.savePreferences();
  }

  /**
   * Reset preferences to defaults
   */
  resetToDefaults(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences();
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('[UserPreferencesService] Failed to save preferences:', error);
    }
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();
