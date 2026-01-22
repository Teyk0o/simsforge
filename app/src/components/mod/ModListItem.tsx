'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CurseForgeMod } from '@/types/curseforge';
import { formatDownloadCount, formatRelativeDate } from '@/utils/formatters';
import { DownloadSimple, Spinner, Check } from "@phosphor-icons/react";
import { useToast } from '@/context/ToastContext';
import { useProfiles } from '@/context/ProfileContext';
import { modInstallationService } from '@/lib/services/ModInstallationService';

interface ModListItemProps {
  mod: CurseForgeMod;
}

export default function ModListItem({ mod }: ModListItemProps) {
  const authorNames = mod.authors.map((a) => a.name).join(', ');
  const categoryNames = mod.categories.slice(0, 2);
  const { showToast, updateToast } = useToast();
  const { refreshProfiles, activeProfile } = useProfiles();
  const [isInstalling, setIsInstalling] = useState(false);

  // Check if mod is already installed in the active profile
  const isInstalled = activeProfile?.mods.some((m) => m.modId === mod.id) ?? false;

  /**
   * Handle mod installation
   */
  const handleInstall = async (e: React.MouseEvent) => {
    // Prevent navigation to mod details page
    e.preventDefault();
    e.stopPropagation();

    if (isInstalling) return;

    try {
      setIsInstalling(true);

      // Get modsPath from localStorage
      const StorageHelper = {
        getLocal: (key: string): string | null => {
          if (typeof window !== 'undefined') {
            return localStorage.getItem(key);
          }
          return null;
        },
        decryptData: async (encryptedData: string, password: string = 'simsforge-settings'): Promise<string | null> => {
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
        }
      };

      const encryptedModsPath = StorageHelper.getLocal('simsforge_mods_path');
      if (!encryptedModsPath) {
        showToast({
          type: 'error',
          title: 'Mods path not configured',
          message: 'Please configure your mods folder in Settings',
          duration: 5000,
        });
        setIsInstalling(false);
        return;
      }

      const modsPath = await StorageHelper.decryptData(encryptedModsPath);
      if (!modsPath) {
        showToast({
          type: 'error',
          title: 'Failed to read mods path',
          message: 'Please reconfigure your mods folder in Settings',
          duration: 5000,
        });
        setIsInstalling(false);
        return;
      }

      // Show initial toast
      const toastId = showToast({
        type: 'download',
        title: `Installing ${mod.name}`,
        message: 'Starting download...',
        progress: 0,
        duration: 0, // Don't auto-dismiss
      });

      // Start installation
      const result = await modInstallationService.installMod(
        mod.id,
        modsPath,
        (progress) => {
          updateToast(toastId, {
            title: `Installing ${mod.name}`,
            message: progress.message,
            progress: progress.percent,
          });
        }
      );

      // Show result
      if (result.success) {
        updateToast(toastId, {
          type: 'success',
          title: 'Installation complete!',
          message: `${result.modName} has been installed successfully`,
          duration: 3000,
        });
        // Refresh profiles to update the library
        await refreshProfiles();
      } else {
        updateToast(toastId, {
          type: 'error',
          title: 'Installation failed',
          message: result.error || 'Unknown error',
          duration: 3000,
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Installation failed',
        message: error.message || 'An unexpected error occurred',
        duration: 5000,
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      className="group rounded-lg px-4 py-3 transition-all duration-200"
      style={{
        backgroundColor: 'var(--ui-panel)',
        border: '1px solid var(--ui-border)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ui-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--ui-panel)')}
    >
      <Link href={`/mods?id=${mod.id}`}>
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Mod Info */}
          <div className="col-span-6 lg:col-span-5">
            <div className="flex items-center gap-3">
              {/* Logo Image */}
              <div className="relative h-14 w-14 rounded-md overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--ui-dark)' }}>
                {mod.logo ? (
                  <Image
                    src={mod.logo}
                    alt={mod.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl" style={{ color: 'var(--text-tertiary)' }}>
                    📦
                  </div>
                )}
              </div>

              {/* Title and Author */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {mod.name}
                </h3>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  by {authorNames || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="col-span-3 lg:col-span-3 hidden md:block">
            <div className="flex gap-1 items-center max-w-full overflow-hidden whitespace-nowrap">
              {categoryNames.map((category, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded truncate flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--ui-hover)',
                    color: 'var(--text-secondary)',
                  }}
                  title={category}
                >
                  {category}
                </span>
              ))}
              {mod.categories.length > 2 && (
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                  +{mod.categories.length - 2}
                </span>
              )}
            </div>
          </div>

          {/* Downloads */}
          <div className="col-span-2 hidden lg:block lg:col-span-1">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {formatDownloadCount(mod.downloadCount)}
            </span>
          </div>

          {/* Last Update */}
          <div className="col-span-3 lg:col-span-2 hidden lg:block text-right">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {formatRelativeDate(mod.dateModified)}
            </span>
          </div>
          {/* Action */}
          <div className="col-span-6 md:col-span-3 lg:col-span-1 flex justify-end">
            <button
              onClick={handleInstall}
              disabled={isInstalling || isInstalled}
              className={`px-3 py-1.5 font-medium rounded text-sm transition-colors disabled:cursor-not-allowed cursor-pointer ${
                isInstalled
                  ? 'bg-gray-500 text-white'
                  : 'bg-brand-green hover:bg-brand-dark text-white disabled:opacity-50'
              }`}
              title={isInstalled ? "Already installed" : isInstalling ? "Installing..." : "Install"}
            >
              {isInstalled ? (
                <Check size={24} weight="bold" />
              ) : isInstalling ? (
                <Spinner size={24} className="animate-spin" />
              ) : (
                <DownloadSimple size={24} />
              )}
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}
