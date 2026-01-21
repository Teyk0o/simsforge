'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Window } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';

type UpdateStatus = 'checking' | 'downloading' | 'installing' | 'starting' | 'error';

/**
 * Splash screen component that checks for updates before launching the main app.
 * Displays a logo animation, version info, and update progress.
 */
export default function SplashPage() {
  const [status, setStatus] = useState<UpdateStatus>('checking');
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    initializeSplash();
  }, []);

  /**
   * Initialize splash screen: load version and check for updates
   */
  async function initializeSplash() {
    try {
      // Get app version
      const appVersion = await getVersion();
      setVersion(appVersion);

      // Check for updates with timeout
      await checkAndUpdate();
    } catch (error) {
      console.error('Splash initialization error:', error);
      setStatus('starting');
      await openMainWindow();
    }
  }

  /**
   * Check for updates and auto-install if available
   */
  async function checkAndUpdate() {
    try {
      setStatus('checking');

      // Check for update with 10s timeout
      const update = await Promise.race([
        check(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Update check timeout')), 10000)
        ),
      ]);

      // If update available, download and install automatically
      if (update?.available) {
        setStatus('downloading');

        let downloaded = 0;
        let contentLength = 0;

        await update.downloadAndInstall((event) => {
          if (event.event === 'Started') {
            contentLength = event.data.contentLength || 0;
          } else if (event.event === 'Progress') {
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
          } else if (event.event === 'Finished') {
            setStatus('installing');
          }
        });

        // Relaunch app after update
        await relaunch();
        return;
      }

      // No update available - proceed to main window
      setStatus('starting');
      await openMainWindow();
    } catch (error) {
      // Timeout or network error - continue to main app anyway
      console.error('Update check failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setStatus('starting');
      await openMainWindow();
    }
  }

  /**
   * Open main window and close splash
   */
  async function openMainWindow() {
    try {
      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get all windows and find the main one
      const allWindows = await Window.getAll();
      const mainWindow = allWindows.find((w) => w.label === 'main');

      if (mainWindow) {
        await mainWindow.show();
        await mainWindow.setFocus();
      }

      // Close splash window
      const splashWindow = await Window.getCurrent();
      await splashWindow.close();
    } catch (error) {
      console.error('Failed to open main window:', error);
    }
  }

  /**
   * Get status text based on current status
   */
  function getStatusText(): string {
    switch (status) {
      case 'checking':
        return 'Checking for updates...';
      case 'downloading':
        return `Downloading update... ${progress}%`;
      case 'installing':
        return 'Installing update...';
      case 'starting':
        return 'Starting...';
      case 'error':
        return 'Error checking updates';
      default:
        return '';
    }
  }

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center select-none"
      style={{
        backgroundColor: '#131313',
      }}
      data-tauri-drag-region
    >
      {/* Icon with spin animation */}
      <div className="relative w-32 h-32 mb-6">
        <div
          className="absolute inset-0"
          style={{
            animation: status === 'checking' || status === 'downloading'
              ? 'spin 2s linear infinite'
              : 'none',
          }}
        >
          <Image
            src="/icon.png"
            alt="SimsForge Icon"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Version */}
      {version && (
        <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
          v{version}
        </p>
      )}

      {/* Progress bar (only when downloading) */}
      {status === 'downloading' && (
        <div
          className="w-48 h-1.5 rounded-full mb-4 overflow-hidden"
          style={{ backgroundColor: '#2a2a2a' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: '#46C89B',
            }}
          />
        </div>
      )}

      {/* Status text */}
      <p className="text-sm" style={{ color: '#9ca3af' }}>
        {getStatusText()}
      </p>

      {/* Error message (subtle) */}
      {errorMessage && status === 'starting' && (
        <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
          (Offline mode)
        </p>
      )}

      {/* Inline keyframes for spin animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}
