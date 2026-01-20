'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, X, Play } from '@phosphor-icons/react';
import { exists } from '@tauri-apps/plugin-fs';
import { Command } from '@tauri-apps/plugin-shell';
import { useAuth } from '@/context/AuthContext';
import { useSearchState } from '@/context/SearchStateContext';
import { useViewMode } from '@/hooks/useViewMode';
import Layout from '@/components/layouts/Layout';
import ModList from '@/components/mod/ModList';
import FilterBar from '@/components/mod/FilterBar';
import { attachConsole } from '@tauri-apps/plugin-log';

type SortOption = 'downloads' | 'date' | 'trending' | 'relevance';
type FilterChip = 'all' | 'updates' | 'early-access' | 'installed';

// Encryption/decryption helper
const StorageHelper = {
  async decryptData(encryptedData: string, password: string = 'simsforge-settings'): Promise<string | null> {
    try {
      const encoder = new TextEncoder();
      const password_encoded = encoder.encode(password);

      const hash_buffer = await crypto.subtle.digest('SHA-256', password_encoded);
      const key = await crypto.subtle.importKey('raw', hash_buffer, 'AES-GCM', false, ['decrypt']);

      const binaryString = atob(encryptedData);
      const combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
      }

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

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

  getLocal(key: string): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }
};

export default function Home() {
  const { isAuthenticated, isLoading, continueWithoutAuth, isOfflineMode } = useAuth();
  const router = useRouter();
  const { viewMode, toggleViewMode } = useViewMode();
  const searchState = useSearchState();
  const [isMounted, setIsMounted] = useState(false);
  const [previousSort, setPreviousSort] = useState<SortOption>('trending');
  const [gamePath, setGamePath] = useState<string | null>(null);
  const [gamePathExists, setGamePathExists] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isGameRunning, setIsGameRunning] = useState(false);

  useEffect(() => {
    attachConsole();
    setIsMounted(true);
    loadGamePath();
  }, []);

  // Monitor game process continuously
  useEffect(() => {
    if (!gamePath) return;

    const processName = getProcessName(gamePath);
    let timeoutId: NodeJS.Timeout;
    let isRunning = false;

    const checkProcess = async () => {
      const running = await checkProcessRunning(processName);
      isRunning = running;
      setIsGameRunning(running);
      if (running) {
        setIsLaunching(false);
      }
      // Check every 5s when not running, every 30s when running
      timeoutId = setTimeout(checkProcess, running ? 30000 : 5000);
    };

    // Initial check
    checkProcess();

    return () => clearTimeout(timeoutId);
  }, [gamePath]);

  const loadGamePath = async () => {
    try {
      const encryptedPath = StorageHelper.getLocal('simsforge_game_path');
      if (encryptedPath) {
        const decrypted = await StorageHelper.decryptData(encryptedPath);
        if (decrypted) {
          setGamePath(decrypted);
          const pathExists = await exists(decrypted);
          setGamePathExists(pathExists);
        }
      }
    } catch (error) {
      console.error('Error loading game path:', error);
    }
  };

  const getProcessName = (path: string): string => {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1];
  };

  const checkProcessRunning = async (processName: string): Promise<boolean> => {
    try {
      const name = processName.replace(/\.exe$/i, '');
      // @ts-ignore
      const cmd = new Command('check-process', ['-Command', `Get-Process -Name ${name} -ErrorAction SilentlyContinue`]);
      const output = await cmd.execute();
      return output.stdout.trim().length > 0;
    } catch {
      return false;
    }
  };

  const handleLaunchGame = async () => {
    if (!gamePath || !gamePathExists) return;

    setIsLaunching(true);
    try {
      // @ts-ignore
      const cmd = new Command('launch-game', ['/c', 'start', '', gamePath]);
      cmd.spawn();

      const processName = getProcessName(gamePath);
      let gameDetected = false;

      // Check process status after launch
      const checkInterval = setInterval(async () => {
        const running = await checkProcessRunning(processName);
        if (running && !gameDetected) {
          gameDetected = true;
          setIsLaunching(false);
          setIsGameRunning(true);
          clearInterval(checkInterval);

          // Start monitoring for game close
          const monitorInterval = setInterval(async () => {
            const stillRunning = await checkProcessRunning(processName);
            if (!stillRunning) {
              setIsGameRunning(false);
              clearInterval(monitorInterval);
            }
          }, 5000);
        }
      }, 2000);

      // Stop checking after 30s if process not detected
      setTimeout(() => {
        if (!gameDetected) {
          clearInterval(checkInterval);
          setIsLaunching(false);
        }
      }, 30000);

    } catch (error) {
      console.error('Error launching game:', error);
      setIsLaunching(false);
    }
  };

  const handleResetFilters = () => {
    searchState.setSearchQuery('');
    searchState.setActiveSort('trending');
    searchState.setActiveFilter('all');
    searchState.setSelectedCategory('');
    searchState.resetScrollIndex();
  };

  const hasActiveFilters =
    searchState.searchQuery !== '' ||
    searchState.activeSort !== 'trending' ||
    searchState.activeFilter !== 'all' ||
    searchState.selectedCategory !== '';


  // No debounce needed - sessionStorage handles persistence
  // Pass searchQuery directly for immediate updates

  // Show loading state while checking authentication
  if (isMounted && isLoading) {
    return (
        <div
          className="h-screen flex items-center justify-center"
          style={{
            background: `linear-gradient(to bottom right, #111827, var(--ui-dark), #111827)`,
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <Spinner size={48} className="animate-spin text-brand-green" />
            <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
          </div>
        </div>
    );
  }

  // Show login screen if not authenticated and not in offline mode
  if (isMounted && !isAuthenticated && !isOfflineMode) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(to bottom right, #111827, var(--ui-dark), #111827)`,
        }}
      >
        <div className="flex flex-col items-center gap-6 max-w-md">
          <h1
            className="text-3xl font-bold text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            SimsForge
          </h1>
          <p
            className="text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            Mod manager for The Sims 4
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 rounded-md transition-colors font-medium text-white"
              style={{
                backgroundColor: '#46C89B',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Sign In
            </button>

            <button
              onClick={continueWithoutAuth}
              className="w-full px-6 py-3 rounded-md border transition-colors font-medium"
              style={{
                backgroundColor: 'var(--ui-panel)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ui-panel)';
              }}
            >
              Continue Without Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render empty while mounting
  if (!isMounted) {
    return null;
  }

  return (
      <Layout>
        <main
          className="flex-1 flex flex-col min-w-0 relative"
          style={{
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {/* Header avec search */}
          <header
            className="h-16 flex items-center gap-3 px-8 border-b shrink-0 z-10"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--ui-panel)',
            }}
          >
            <div className="w-96 relative">
              <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-secondary)' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                  type="text"
                  placeholder="Rechercher des mods..."
                  value={searchState.searchQuery}
                  onChange={(e) => searchState.setSearchQuery(e.target.value)}
                  className="w-full rounded-full text-sm py-2.5 pl-10 pr-4 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--ui-border)',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#46C89B';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(70, 200, 155, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ui-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
              />
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-3 rounded-full border text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer h-10"
                style={{
                  backgroundColor: 'var(--ui-panel)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ui-panel)';
                }}
              >
                <X size={14} />
                Réinitialiser
              </button>
            )}

            {/* Spacer to push button to the right */}
            <div className="flex-1" />

            {/* Launch Game Button */}
            {gamePathExists && (
              <button
                onClick={handleLaunchGame}
                disabled={isLaunching || isGameRunning}
                className="px-3 rounded-full border text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 h-10"
                style={{
                  backgroundColor: isGameRunning ? '#3B82F6' : '#46C89B',
                  borderColor: isGameRunning ? '#3B82F6' : '#46C89B',
                  color: 'white',
                  opacity: isLaunching || isGameRunning ? 0.9 : 1,
                  cursor: isLaunching || isGameRunning ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isLaunching && !isGameRunning) {
                    e.currentTarget.style.backgroundColor = '#3aad87';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLaunching && !isGameRunning) {
                    e.currentTarget.style.backgroundColor = '#46C89B';
                  }
                }}
              >
                {isGameRunning ? (
                  <Spinner size={14} className="animate-spin" />
                ) : (
                  <Play size={14} weight="fill" />
                )}
                {isLaunching ? 'Lancement...' : isGameRunning ? 'En cours' : 'Jouer'}
              </button>
            )}
          </header>

          {/* Filter Bar */}
          {searchState.isLoaded && (
            <FilterBar
                onSortChange={searchState.setActiveSort}
                activeSort={searchState.activeSort}
                onFilterChange={searchState.setActiveFilter}
                activeFilter={searchState.activeFilter}
                onCategoryChange={searchState.setSelectedCategory}
                selectedCategory={searchState.selectedCategory}
                viewMode={viewMode}
                onViewModeChange={toggleViewMode}
            />
          )}

          {/* Mod List */}
          {searchState.isLoaded && (
            <ModList
              searchQuery={searchState.searchQuery}
              sortBy={searchState.activeSort}
              category={searchState.selectedCategory}
              viewMode={viewMode}
              activeFilter={searchState.activeFilter}
              scrollIndex={searchState.scrollIndex}
            />
          )}
        </main>
      </Layout>
  );
}