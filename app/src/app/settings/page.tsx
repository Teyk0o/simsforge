'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash, Folder, Sliders, Warning, CheckCircle, FolderOpen, Terminal, HardDrive, Globe, CaretDown } from '@phosphor-icons/react';
import { open } from '@tauri-apps/plugin-dialog';
import { exists, readDir, remove } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import Layout from '@/components/layouts/Layout';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { userPreferencesService } from '@/lib/services/UserPreferencesService';
import { modCacheService } from '@/lib/services/ModCacheService';
import { profileService } from '@/lib/services/ProfileService';
import { backupService } from '@/lib/services/BackupService';
import { updateCheckService } from '@/lib/services/UpdateCheckService';
import { logEnablerService } from '@/lib/services/LogEnablerService';
import {
  diskPerformanceService,
  type DiskPerformanceConfig,
  type DiskType,
} from '@/lib/services/DiskPerformanceService';
import { concurrentMap } from '@/lib/utils/concurrencyPool';
import { useToast } from '@/context/ToastContext';
import { useLanguage, type SupportedLanguage } from '@/context/LanguageContext';

interface Message {
  type: 'success' | 'error';
  text: string;
}

// Simple encryption/decryption helper using Web Crypto API
const StorageHelper = {
  async encryptData(data: string, password: string = 'simsforge-settings'): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data_encoded = encoder.encode(data);
      const password_encoded = encoder.encode(password);

      // Create a hash of the password to use as key
      const hash_buffer = await crypto.subtle.digest('SHA-256', password_encoded);
      const key = await crypto.subtle.importKey('raw', hash_buffer, 'AES-GCM', false, ['encrypt']);

      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data_encoded
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64 for storage
      let binaryString = '';
      for (let i = 0; i < combined.length; i++) {
        binaryString += String.fromCharCode(combined[i]);
      }
      return btoa(binaryString);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  },

  async decryptData(encryptedData: string, password: string = 'simsforge-settings'): Promise<string | null> {
    try {
      const encoder = new TextEncoder();
      const password_encoded = encoder.encode(password);

      // Create a hash of the password
      const hash_buffer = await crypto.subtle.digest('SHA-256', password_encoded);
      const key = await crypto.subtle.importKey('raw', hash_buffer, 'AES-GCM', false, ['decrypt']);

      // Decode from base64
      const binaryString = atob(encryptedData);
      const combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
      }

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  },

  setLocal(key: string, value: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },

  getLocal(key: string): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },

  removeLocal(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

export default function SettingsPage() {
  const [curseforgeKey, setCurseforgeKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [pathsMessage, setPathsMessage] = useState<Message | null>(null);
  const [apiKeyMessage, setApiKeyMessage] = useState<Message | null>(null);
  const [autoUpdates, setAutoUpdates] = useState(true);
  const [backup, setBackup] = useState(true);
  const [fakeModDetection, setFakeModDetection] = useState(true);
  const [gameLogging, setGameLogging] = useState(true);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [gamePath, setGamePath] = useState('C:\\Program Files\\EA Games\\The Sims 4\\Game\\Bin\\TS4_x64.exe');
  const [modsPath, setModsPath] = useState('C:\\Users\\Simmer\\Documents\\Electronic Arts\\The Sims 4\\Mods');
  const [gamePathExists, setGamePathExists] = useState(false);
  const [modsPathExists, setModsPathExists] = useState(false);
  const [dangerMessage, setDangerMessage] = useState<Message | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [resettingDatabase, setResettingDatabase] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [showDisableDetectionConfirmation, setShowDisableDetectionConfirmation] = useState(false);
  const [showDisableLoggingConfirmation, setShowDisableLoggingConfirmation] = useState(false);
  const [installingLogEnabler, setInstallingLogEnabler] = useState(false);
  const [diskConfig, setDiskConfig] = useState<DiskPerformanceConfig | null>(null);
  const [diskType, setDiskType] = useState<DiskType | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const { showToast, dismissToast } = useToast();
  const { language, setLanguage, supportedLanguages, languageNames } = useLanguage();

  useEffect(() => {
    loadLocalSettings();
  }, []);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle language change
   */
  function handleLanguageChange(lang: SupportedLanguage) {
    setLanguage(lang);
    userPreferencesService.setLanguage(lang);
    setLanguageDropdownOpen(false);
  }

  async function checkPathExists(path: string): Promise<boolean> {
    try {
      const result = await exists(path);
      return result;
    } catch (error) {
      console.error('Error checking path:', error);
      return false;
    }
  }

  async function loadLocalSettings() {
    try {
      // Load encrypted API key
      const encryptedKey = StorageHelper.getLocal('simsforge_api_key');
      if (encryptedKey) {
        const decrypted = await StorageHelper.decryptData(encryptedKey);
        if (decrypted) {
          setCurseforgeKey(decrypted);
          setIsConfigured(true);
        }
      }

      // Load game path
      const encryptedGamePath = StorageHelper.getLocal('simsforge_game_path');
      if (encryptedGamePath) {
        const decrypted = await StorageHelper.decryptData(encryptedGamePath);
        if (decrypted) {
          setGamePath(decrypted);
          const pathExists = await checkPathExists(decrypted);
          setGamePathExists(pathExists);
        }
      }

      // Load mods path
      const encryptedModsPath = StorageHelper.getLocal('simsforge_mods_path');
      if (encryptedModsPath) {
        const decrypted = await StorageHelper.decryptData(encryptedModsPath);
        if (decrypted) {
          setModsPath(decrypted);
          const pathExists = await checkPathExists(decrypted);
          setModsPathExists(pathExists);
        }
      }

      // Load user preferences (auto-updates, backup, fake mod detection, game logging)
      await userPreferencesService.initialize();
      const preferences = userPreferencesService.getPreferences();
      setAutoUpdates(preferences.autoUpdates);
      setBackup(preferences.backupBeforeUpdate);
      setFakeModDetection(preferences.fakeModDetection);
      setGameLogging(preferences.gameLogging);
      setShowDebugLogs(preferences.showDebugLogs);

      // Load disk performance config
      await diskPerformanceService.initialize();
      const config = await diskPerformanceService.getConfig();
      const type = await diskPerformanceService.getDiskType();
      setDiskConfig(config);
      setDiskType(type);
    } catch (error) {
      console.error('Error loading local settings:', error);
    } finally {
      setCheckingConfig(false);
    }
  }

  async function handleGamePathSelect() {
    const directory = await open({
      multiple: false,
      directory: false,
    });

    if (directory) {
      const path = directory as string;
      setGamePath(path);

      // Check if path exists
      const pathExists = await checkPathExists(path);
      setGamePathExists(pathExists);

      // Encrypt and save locally
      try {
        const encrypted = await StorageHelper.encryptData(path);
        StorageHelper.setLocal('simsforge_game_path', encrypted);
        setPathsMessage({ type: 'success', text: 'Game path updated' });
        setTimeout(() => setPathsMessage(null), 5000);
      } catch (error) {
        setPathsMessage({ type: 'error', text: 'Failed to save game path' });
      }
    }
  }

  async function handleModsPathSelect() {
    const directory = await open({
      multiple: false,
      directory: true,
    });

    if (directory) {
      const path = directory as string;
      setModsPath(path);

      // Check if path exists
      const pathExists = await checkPathExists(path);
      setModsPathExists(pathExists);

      // Encrypt and save locally
      try {
        const encrypted = await StorageHelper.encryptData(path);
        StorageHelper.setLocal('simsforge_mods_path', encrypted);
        setPathsMessage({ type: 'success', text: 'Mods path updated' });
        setTimeout(() => setPathsMessage(null), 5000);
      } catch (error) {
        setPathsMessage({ type: 'error', text: 'Failed to save mods path' });
      }
    }
  }

  async function handleSave() {
    if (!curseforgeKey.trim()) {
      setApiKeyMessage({ type: 'error', text: 'Please enter a valid API key' });
      return;
    }

    setLoading(true);

    try {
      // Encrypt and save locally
      const encrypted = await StorageHelper.encryptData(curseforgeKey);
      StorageHelper.setLocal('simsforge_api_key', encrypted);

      setApiKeyMessage({ type: 'success', text: 'API key saved securely!' });
      setIsConfigured(true);
      setTimeout(() => setApiKeyMessage(null), 5000);
    } catch (error: any) {
      const errorMessage = 'Failed to save API key';
      setApiKeyMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);

    try {
      // Remove from local storage
      StorageHelper.removeLocal('simsforge_api_key');

      setApiKeyMessage({ type: 'success', text: 'API key deleted successfully' });
      setIsConfigured(false);
      setCurseforgeKey('');
      setTimeout(() => setApiKeyMessage(null), 5000);
    } catch (error: any) {
      const errorMessage = 'Failed to delete API key';
      setApiKeyMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clear the mod cache (downloaded mod files in AppData)
   */
  async function handleClearCache() {
    setClearingCache(true);
    setDangerMessage(null);

    try {
      // Initialize and cleanup mod cache
      await modCacheService.initialize();
      const cacheStats = await modCacheService.getCacheStats();

      // Cleanup all orphaned cache entries
      const cleanupResult = await modCacheService.cleanupOrphans();

      // Clear backups
      const backupResult = await backupService.clearAllBackups();

      // Clear update state
      await updateCheckService.initialize();
      await updateCheckService.clearAllUpdates();

      const totalDeleted = cleanupResult.deleted + backupResult.deleted;
      const freedMB = (cleanupResult.freedBytes / (1024 * 1024)).toFixed(2);

      setDangerMessage({
        type: 'success',
        text: `Cache cleared: ${totalDeleted} items removed, ${freedMB} MB freed`,
      });
      setTimeout(() => setDangerMessage(null), 5000);
    } catch (error: any) {
      console.error('Failed to clear cache:', error);
      setDangerMessage({
        type: 'error',
        text: error.message || 'Failed to clear cache',
      });
    } finally {
      setClearingCache(false);
    }
  }

  /**
   * Reset database: delete all profiles, cache, and mod files from disk
   */
  async function handleResetDatabase() {
    setResettingDatabase(true);
    setDangerMessage(null);

    try {
      // Get pool size for parallel operations
      const poolSize = await diskPerformanceService.getPoolSize();

      // 1. Delete all mod files from the Mods folder (parallel)
      if (modsPath && modsPathExists) {
        try {
          const entries = await readDir(modsPath);
          const directories = entries.filter((e) => e.isDirectory);

          await concurrentMap(
            directories,
            async (entry) => {
              const fullPath = await join(modsPath, entry.name);
              await remove(fullPath, { recursive: true });
            },
            poolSize
          );
        } catch (error) {
          console.warn('Failed to clear mods folder:', error);
        }
      }

      // 2. Deactivate and delete all profiles (parallel)
      await profileService.initialize();
      // First deactivate the active profile
      await profileService.setActiveProfile(null);
      // Then delete all profiles in parallel
      const profiles = await profileService.getAllProfiles();
      await concurrentMap(
        profiles,
        async (profile) => {
          await profileService.deleteProfile(profile.id);
        },
        poolSize
      );

      // 3. Clear all mod cache
      await modCacheService.initialize();
      // Force cleanup of all cache entries by removing profile references
      await modCacheService.cleanupOrphans();

      // 4. Clear all backups
      await backupService.clearAllBackups();

      // 5. Clear update state
      await updateCheckService.initialize();
      await updateCheckService.clearAllUpdates();

      // 6. Clear user preferences
      userPreferencesService.resetToDefaults();

      setShowResetConfirmation(false);
      setDangerMessage({
        type: 'success',
        text: 'Database reset complete. All mods and profiles have been deleted.',
      });

      // Reload the page to reset all state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Failed to reset database:', error);
      setShowResetConfirmation(false);
      setDangerMessage({
        type: 'error',
        text: error.message || 'Failed to reset database',
      });
    } finally {
      setResettingDatabase(false);
    }
  }

  /**
   * Run disk performance benchmark
   */
  async function handleRunBenchmark() {
    setRunningBenchmark(true);
    setBenchmarkProgress(0);

    try {
      const config = await diskPerformanceService.runBenchmark((progress) => {
        setBenchmarkProgress(progress);
      });

      const type = await diskPerformanceService.getDiskType();
      setDiskConfig(config);
      setDiskType(type);

      showToast({
        type: 'success',
        title: 'Benchmark complete',
        message: `Detected ${type?.toUpperCase() || 'disk'} at ${config.diskSpeedMBps} MB/s`,
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Benchmark failed:', error);
      showToast({
        type: 'error',
        title: 'Benchmark failed',
        message: error.message || 'Could not measure disk performance.',
        duration: 5000,
      });
    } finally {
      setRunningBenchmark(false);
      setBenchmarkProgress(0);
    }
  }

  /**
   * Handle enabling game logging - installs the Sims Log Enabler mod
   */
  async function handleEnableGameLogging() {
    // Check if mods path is configured
    if (!modsPath || !modsPathExists) {
      showToast({
        type: 'error',
        title: 'Mods folder not configured',
        message: 'Please configure your Mods folder path first.',
        duration: 5000,
      });
      return;
    }

    setInstallingLogEnabler(true);

    const toastId = showToast({
      type: 'info',
      title: 'Installing Sims Log Enabler',
      message: 'Downloading and installing...',
      duration: 0, // Don't auto-dismiss
    });

    try {
      const result = await logEnablerService.install(modsPath);

      dismissToast(toastId);

      if (result.success) {
        setGameLogging(true);
        userPreferencesService.setGameLogging(true);
        showToast({
          type: 'success',
          title: 'Game logging enabled',
          message: 'Sims Log Enabler installed successfully.',
          duration: 3000,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Installation failed',
          message: result.error || 'Could not install Sims Log Enabler.',
          duration: 5000,
        });
      }
    } catch (error: any) {
      dismissToast(toastId);
      console.error('Failed to enable game logging:', error);
      showToast({
        type: 'error',
        title: 'Installation failed',
        message: error.message || 'Could not install Sims Log Enabler.',
        duration: 5000,
      });
    } finally {
      setInstallingLogEnabler(false);
    }
  }

  /**
   * Handle disabling game logging - removes the Sims Log Enabler mod
   */
  async function handleDisableGameLogging() {
    setInstallingLogEnabler(true);
    setShowDisableLoggingConfirmation(false);

    try {
      // Try to uninstall if mods path is available
      if (modsPath && modsPathExists) {
        const result = await logEnablerService.uninstall(modsPath);

        if (!result.success) {
          showToast({
            type: 'warning',
            title: 'Uninstall warning',
            message: result.error || 'Could not remove the mod file, but logging has been disabled.',
            duration: 5000,
          });
        }
      }

      // Always update the preference
      setGameLogging(false);
      userPreferencesService.setGameLogging(false);

      showToast({
        type: 'success',
        title: 'Game logging disabled',
        message: 'Sims Log Enabler has been removed.',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Failed to disable game logging:', error);
      // Still disable the preference even if uninstall fails
      setGameLogging(false);
      userPreferencesService.setGameLogging(false);

      showToast({
        type: 'warning',
        title: 'Game logging disabled',
        message: 'Preference updated, but could not remove the mod file.',
        duration: 5000,
      });
    } finally {
      setInstallingLogEnabler(false);
    }
  }

  if (checkingConfig) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-ui-dark text-gray-800 dark:text-gray-200 p-8 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <Layout>
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-ui-dark">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 dark:border-ui-border bg-white dark:bg-ui-panel shrink-0 z-10">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <button onClick={handleSave} disabled={loading || !curseforgeKey.trim()} className="px-4 py-2 bg-brand-green text-white text-sm font-bold rounded-lg shadow-lg hover:bg-brand-dark transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </header>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-10">

            {/* SECTION: APPLICATION */}
            <section id="application">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe size={20} className="text-brand-green" /> Application
                </h2>
                <p className="text-sm text-gray-500 mt-1">General application settings.</p>
              </div>

              <div className="bg-white dark:bg-ui-panel border border-gray-200 dark:border-ui-border rounded-xl p-6 shadow-sm space-y-6">
                {/* Language Selector */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Language</div>
                    <div className="text-sm text-gray-500">Choose the display language for SimsForge.</div>
                  </div>

                  <div className="relative" ref={languageDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-ui-hover border border-gray-300 dark:border-ui-border rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer min-w-[160px] justify-between"
                    >
                      <span className="text-gray-900 dark:text-white font-medium">
                        {languageNames[language]}
                      </span>
                      <CaretDown
                        size={16}
                        className={`text-gray-500 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {languageDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-full bg-white dark:bg-ui-panel border border-gray-200 dark:border-ui-border rounded-lg shadow-lg z-50 overflow-hidden">
                        {supportedLanguages.map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleLanguageChange(lang)}
                            className={`w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-ui-hover transition-colors cursor-pointer ${
                              lang === language
                                ? 'bg-brand-green/10 text-brand-green font-medium'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {languageNames[lang]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION: GAME PATHS */}
            <section id="game-paths">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Folder size={20} className="text-brand-green" /> Game Location
                </h2>
                <p className="text-sm text-gray-500 mt-1">Define where SimsForge should look for your installation and mods.</p>
              </div>

              <div className="bg-white dark:bg-ui-panel border border-gray-200 dark:border-ui-border rounded-xl p-6 shadow-sm space-y-6">
                {/* Game Path */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">The Sims 4 Executable</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gamePath}
                      onChange={(e) => setGamePath(e.target.value)}
                      disabled
                      className="w-full bg-gray-50 dark:bg-ui-input border border-gray-300 dark:border-ui-border text-gray-900 dark:text-gray-900 text-sm rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-green outline-none disabled:opacity-90"
                    />
                    <button type="button" onClick={handleGamePathSelect} className="px-4 py-2 bg-gray-100 dark:bg-ui-hover border border-gray-300 dark:border-ui-border rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      <FolderOpen size={20} />
                    </button>
                  </div>
                  <div className={`mt-2 flex items-center gap-2 text-xs font-medium ${gamePathExists ? 'text-brand-green' : 'text-amber-500'}`}>
                    {gamePathExists ? (
                      <>
                        <CheckCircle size={16} /> Game detected successfully
                      </>
                    ) : (
                      <>
                        <Warning size={16} /> Game path not found
                      </>
                    )}
                  </div>
                </div>

                {/* Mods Folder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mods Folder</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={modsPath}
                      onChange={(e) => setModsPath(e.target.value)}
                      disabled
                      className="w-full bg-gray-50 dark:bg-ui-input border border-gray-300 dark:border-ui-border text-gray-900 dark:text-gray-900 text-sm rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-green outline-none disabled:opacity-90"
                    />
                    <button type="button" onClick={handleModsPathSelect} className="px-4 py-2 bg-gray-100 dark:bg-ui-hover border border-gray-300 dark:border-ui-border rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      <FolderOpen size={20} />
                    </button>
                  </div>
                  <div className={`mt-2 flex items-center gap-2 text-xs font-medium ${modsPathExists ? 'text-brand-green' : 'text-amber-500'}`}>
                    {modsPathExists ? (
                      <>
                        <CheckCircle size={16} /> Mods folder detected
                      </>
                    ) : (
                      <>
                        <Warning size={16} /> Mods folder not found
                      </>
                    )}
                  </div>
                </div>

                {/* Message Display for Paths */}
                {pathsMessage && (
                  <div
                    className={`mt-4 p-3 rounded text-sm flex items-center gap-2 ${
                      pathsMessage.type === 'success'
                        ? 'bg-green-900/50 text-green-300 border border-green-700'
                        : 'bg-red-900/50 text-red-300 border border-red-700'
                    }`}
                  >
                    {pathsMessage.type === 'success' ? <span>✓</span> : <span>✕</span>}
                    {pathsMessage.text}
                  </div>
                )}
              </div>
            </section>

            {/* SECTION: API KEYS */}
            <section id="api-keys">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sliders size={20} className="text-brand-blue" /> API Keys
                </h2>
                <p className="text-sm text-gray-500 mt-1">Configure API keys for external services like CurseForge.</p>
              </div>

              <div className="bg-white dark:bg-ui-panel border border-gray-200 dark:border-ui-border rounded-xl p-6 shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CurseForge API Key
                    {isConfigured && (
                      <span className="ml-2 inline-block text-brand-green text-xs bg-green-900/30 px-2 py-1 rounded">
                        ✓ Configured
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Get your API key from{' '}
                    <a
                      href="https://console.curseforge.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-green hover:underline"
                    >
                      CurseForge Console
                    </a>
                  </p>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={'password'}
                        value={curseforgeKey}
                        onChange={(e) => setCurseforgeKey(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !loading) {
                            handleSave();
                          }
                        }}
                        placeholder="Enter your CurseForge API key"
                        disabled={loading}
                        className="w-full bg-gray-50 dark:bg-ui-input border border-gray-300 dark:border-ui-border text-gray-900 dark:text-gray-900 text-sm rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-brand-green outline-none disabled:opacity-50"
                      />
                    </div>

                    {isConfigured && (
                      <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Trash size={20} weight="fill" />
                      </button>
                    )}
                  </div>

                  {apiKeyMessage && (
                    <div
                      className={`mt-4 p-3 rounded text-sm flex items-center gap-2 ${
                        apiKeyMessage.type === 'success'
                          ? 'bg-green-900/50 text-green-300 border border-green-700'
                          : 'bg-red-900/50 text-red-300 border border-red-700'
                      }`}
                    >
                      {apiKeyMessage.type === 'success' ? <span>✓</span> : <span>✕</span>}
                      {apiKeyMessage.text}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* SECTION: MOD PREFERENCES */}
            <section id="preferences">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sliders size={20} className="text-brand-blue" /> Mod Preferences
                </h2>
              </div>

              <div className="bg-white dark:bg-ui-panel border border-gray-200 dark:border-ui-border rounded-xl p-6 shadow-sm space-y-6">
                {/* Auto Updates */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Auto-updates</div>
                    <div className="text-sm text-gray-500">Download and install mod updates as soon as they're available.</div>
                  </div>

                  <button
                    onClick={() => {
                      const newValue = !autoUpdates;
                      setAutoUpdates(newValue);
                      userPreferencesService.setAutoUpdates(newValue);
                    }}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
                      autoUpdates ? 'bg-brand-green' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        autoUpdates ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <hr className="border-gray-200 dark:border-ui-border" />

                {/* Backup */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Backup before updating</div>
                    <div className="text-sm text-gray-500">Create a copy of overwritten files in the <code>/Backups</code> folder.</div>
                  </div>

                  <button
                    onClick={() => {
                      const newValue = !backup;
                      setBackup(newValue);
                      userPreferencesService.setBackupBeforeUpdate(newValue);
                    }}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
                      backup ? 'bg-brand-green' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        backup ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <hr className="border-gray-200 dark:border-ui-border" />

                {/* Fake Mod Detection */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      Fake mod detection
                    </div>
                    <div className="text-sm text-gray-500">Show warnings and block banned creators when suspicious mods are detected.</div>
                  </div>

                  <button
                    onClick={() => {
                      if (fakeModDetection) {
                        // Disabling: show confirmation modal
                        setShowDisableDetectionConfirmation(true);
                      } else {
                        // Enabling: apply immediately
                        setFakeModDetection(true);
                        userPreferencesService.setFakeModDetection(true);
                      }
                    }}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
                      fakeModDetection ? 'bg-brand-green' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        fakeModDetection ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* SECTION: ADVANCED */}
            <section id="advanced">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Terminal size={20} className="text-purple-500" /> Advanced
                </h2>
                <p className="text-sm text-gray-500 mt-1">Additional options for troubleshooting and diagnostics.</p>
              </div>

              <div className="bg-white dark:bg-ui-panel border border-gray-200 dark:border-ui-border rounded-xl p-6 shadow-sm space-y-6">
                {/* Game Logging */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      Game logging
                    </div>
                    <div className="text-sm text-gray-500">
                      Enable real-time log viewing from The Sims 4. SimsForge will automatically install the{' '}
                      <a
                        href="https://scumbumbomods.com/sims-log-enabler/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-green hover:underline"
                      >
                        Sims Log Enabler
                      </a>{' '}
                      mod when enabled.
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (installingLogEnabler) return; // Prevent clicks during installation

                      if (gameLogging) {
                        // Disabling: show confirmation modal
                        setShowDisableLoggingConfirmation(true);
                      } else {
                        // Enabling: install the mod first
                        handleEnableGameLogging();
                      }
                    }}
                    disabled={installingLogEnabler}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      gameLogging ? 'bg-brand-green' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    {installingLogEnabler ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </span>
                    ) : (
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          gameLogging ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    )}
                  </button>
                </div>

                {/* Show Debug Logs - only visible when Game Logging is enabled */}
                {gameLogging && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-ui-border">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        Show debug logs
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        For mod developers only. Significantly increases console output.
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const newValue = !showDebugLogs;
                        setShowDebugLogs(newValue);
                        userPreferencesService.setShowDebugLogs(newValue);
                      }}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
                        showDebugLogs ? 'bg-brand-green' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          showDebugLogs ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* SECTION: DISK PERFORMANCE */}
            <section id="disk-performance">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HardDrive size={20} className="text-brand-blue" /> Disk Performance
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Auto-detected disk speed determines parallel operation limits.
                </p>
              </div>

              <div className="bg-white dark:bg-ui-panel border border-gray-200 dark:border-ui-border rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {diskConfig ? (
                        <>
                          Detected: {diskType?.toUpperCase() || 'Unknown'}
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            ({diskConfig.diskSpeedMBps} MB/s)
                          </span>
                        </>
                      ) : (
                        'Not benchmarked'
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {diskConfig ? (
                        <>
                          Concurrent operations: {diskConfig.poolSize}
                          <span className="mx-2">·</span>
                          Last tested: {new Date(diskConfig.lastBenchmark).toLocaleDateString()}
                        </>
                      ) : (
                        'Run a benchmark to optimize file operation speed.'
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleRunBenchmark}
                    disabled={runningBenchmark}
                    className="px-4 py-2 bg-gray-100 dark:bg-ui-hover border border-gray-300 dark:border-ui-border text-gray-900 dark:text-white font-bold text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {runningBenchmark ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                        {benchmarkProgress}%
                      </>
                    ) : (
                      diskConfig ? 'Re-run Benchmark' : 'Run Benchmark'
                    )}
                  </button>
                </div>

                {runningBenchmark && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-brand-green h-2 rounded-full transition-all duration-300"
                      style={{ width: `${benchmarkProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* SECTION: DANGER ZONE */}
            <section id="danger" className="pb-10">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-brand-danger flex items-center gap-2">
                  <Warning size={20} /> Danger Zone
                </h2>
              </div>

              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Clear SimsForge cache</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Can resolve missing images or blocked downloads.</div>
                  </div>
                  <button
                    onClick={handleClearCache}
                    disabled={clearingCache}
                    className="px-4 py-2 bg-white dark:bg-ui-panel border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {clearingCache ? 'Clearing...' : 'Clear cache'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Reset database</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Delete all profiles, cached mods, and mod files from disk.</div>
                  </div>
                  <button
                    onClick={() => setShowResetConfirmation(true)}
                    disabled={resettingDatabase}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resettingDatabase ? 'Resetting...' : 'Reset'}
                  </button>
                </div>

                {/* Danger Zone Message */}
                {dangerMessage && (
                  <div
                    className={`p-3 rounded text-sm flex items-center gap-2 ${
                      dangerMessage.type === 'success'
                        ? 'bg-green-900/50 text-green-300 border border-green-700'
                        : 'bg-red-900/50 text-red-300 border border-red-700'
                    }`}
                  >
                    {dangerMessage.type === 'success' ? <span>✓</span> : <span>✕</span>}
                    {dangerMessage.text}
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Reset Database Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        onConfirm={handleResetDatabase}
        title="Reset Database"
        message="This will permanently delete all your profiles, cached mods, and mod files from your Mods folder. This action cannot be undone."
        confirmText="Reset Everything"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={resettingDatabase}
      />

      {/* Disable Fake Mod Detection Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDisableDetectionConfirmation}
        onClose={() => setShowDisableDetectionConfirmation(false)}
        onConfirm={() => {
          setFakeModDetection(false);
          userPreferencesService.setFakeModDetection(false);
          setShowDisableDetectionConfirmation(false);
        }}
        title="Disable Fake Mod Detection"
        message="Disabling this feature will remove all warnings, reports, and banned creator blocks. You will no longer be protected against suspicious or fake mods."
        confirmText="Disable"
        cancelText="Keep Enabled"
        isDangerous={true}
      />

      {/* Disable Game Logging Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDisableLoggingConfirmation}
        onClose={() => setShowDisableLoggingConfirmation(false)}
        onConfirm={handleDisableGameLogging}
        title="Disable Game Logging"
        message="Disabling game logging will remove the Sims Log Enabler mod from your Mods folder and prevent you from viewing real-time logs from The Sims 4."
        confirmText="Disable"
        cancelText="Keep Enabled"
        isDangerous={false}
        isLoading={installingLogEnabler}
      />
    </Layout>
  );
}
