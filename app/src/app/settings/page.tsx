'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeSlash, Trash, Folder, Users, Sliders, Warning, CheckCircle, FolderOpen, DiscordLogo, PatreonLogo, X } from '@phosphor-icons/react';
import { open } from '@tauri-apps/plugin-dialog';
import { exists } from '@tauri-apps/plugin-fs';
import {
  saveCurseForgeApiKey,
  getConfiguredServices,
  deleteApiKey,
} from '@/lib/curseforgeApi';
import Layout from '@/components/layouts/Layout';

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
  const [gamePath, setGamePath] = useState('C:\\Program Files\\EA Games\\The Sims 4\\Game\\Bin\\TS4_x64.exe');
  const [modsPath, setModsPath] = useState('C:\\Users\\Simmer\\Documents\\Electronic Arts\\The Sims 4\\Mods');
  const [gamePathExists, setGamePathExists] = useState(false);
  const [modsPathExists, setModsPathExists] = useState(false);

  useEffect(() => {
    loadLocalSettings();
  }, []);

  async function checkPathExists(path: string): Promise<boolean> {
    try {
      console.log('Checking path:', path);
      const result = await exists(path);
      console.log('Path exists result:', result);
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
          <button onClick={handleSave} disabled={loading || !curseforgeKey.trim()} className="px-4 py-2 bg-brand-green text-white text-sm font-bold rounded-lg shadow-lg hover:bg-brand-dark transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </header>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-10">

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
                    <button type="button" onClick={handleGamePathSelect} className="px-4 py-2 bg-gray-100 dark:bg-ui-hover border border-gray-300 dark:border-ui-border rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
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
                    <button type="button" onClick={handleModsPathSelect} className="px-4 py-2 bg-gray-100 dark:bg-ui-hover border border-gray-300 dark:border-ui-border rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
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

            {/* SECTION: CONNECTED ACCOUNTS */}
            <section id="accounts">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users size={20} className="text-brand-purple" /> Connected Accounts
                </h2>
              </div>

              <div className="bg-white dark:bg-ui-panel border border-gray-200 dark:border-ui-border rounded-xl overflow-hidden shadow-sm">
                {/* Patreon */}
                <div className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-ui-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#FF424D] rounded-full flex items-center justify-center text-white text-xl">
                      <PatreonLogo size={32} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">Patreon</div>
                      <div className="text-sm text-gray-500">Not connected</div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20">
                    Connect
                  </button>
                </div>

                {/* Discord */}
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#5865f2] rounded-full flex items-center justify-center text-white text-lg font-bold">
                      <DiscordLogo size={32} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">Discord</div>
                      <div className="text-sm text-gray-500">Not connected</div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20">
                    Connect
                  </button>
                </div>
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
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
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
                    onClick={() => setAutoUpdates(!autoUpdates)}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
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
                    onClick={() => setBackup(!backup)}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
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
              </div>
            </section>

            {/* SECTION: DANGER ZONE */}
            <section id="danger" className="pb-10">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-brand-danger flex items-center gap-2">
                  <Warning size={20} /> Danger Zone
                </h2>
              </div>

              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Clear SimsForge cache</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Can resolve missing images or blocked downloads.</div>
                  </div>
                  <button className="px-4 py-2 bg-white dark:bg-ui-panel border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    Clear cache
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Reset database</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Forget all installed mods (does not delete files from disk).</div>
                  </div>
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors">
                    Reset
                  </button>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>
    </Layout>
  );
}
