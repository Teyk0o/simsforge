/**
 * Mod Card Component for Grid View
 *
 * Vertical card displaying mod with image, title, and installation
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DownloadSimple, Spinner } from '@phosphor-icons/react';
import { CurseForgeMod } from '@/types/curseforge';
import { useToast } from '@/context/ToastContext';
import { useProfiles } from '@/context/ProfileContext';
import { modInstallationService } from '@/lib/services/ModInstallationService';
import { formatDownloadCount, formatRelativeDate } from '@/utils/formatters';

interface ModCardProps {
  mod: CurseForgeMod;
}

/**
 * Card component for grid view
 * Displays mod with prominent image, title, summary, and install button
 */
export default function ModCard({ mod }: ModCardProps) {
  const authorNames = mod.authors.map((a) => a.name).join(', ');
  const categoryNames = mod.categories.slice(0, 2);
  const { showToast, updateToast } = useToast();
  const { refreshProfiles } = useProfiles();
  const [isInstalling, setIsInstalling] = useState(false);

  /**
   * Handle mod installation from card
   */
  const handleInstall = async (e: React.MouseEvent) => {
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
          duration: 3000,
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
          duration: 3000,
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
        duration: 0, // Don't auto-dismiss during download
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
        duration: 3000,
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Link href={`/mods?id=${mod.id}`}>
      <div
        className="group rounded-lg overflow-hidden transition-all duration-200 h-full flex flex-col"
        style={{
          backgroundColor: 'var(--ui-panel)',
          border: '1px solid var(--ui-border)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ui-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--ui-panel)')}
      >

        {/* Image Section */}
        <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
          {mod.logo ? (
            <Image
              src={mod.logo}
              alt={mod.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: 'var(--text-tertiary)' }}>
              📦
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        </div>

        {/* Content Section */}
        <div className="p-4 flex-1 flex flex-col gap-3">

          {/* Title and Author */}
          <div className="h-14">
            <h3 className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
              {mod.name}
            </h3>
            <p className="text-xs line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
              by {authorNames || 'Unknown'}
            </p>
          </div>

          {/* Summary */}
          {mod.summary && (
            <p className="text-xs line-clamp-2 overflow-hidden min-h-8" style={{ color: 'var(--text-secondary)' }}>
              {mod.summary}
            </p>
          )}

          {/* Categories */}
          {categoryNames.length > 0 && (
            <div className="flex gap-1 flex-wrap overflow-hidden h-7">
              {categoryNames.map((cat, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded truncate flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--ui-hover)',
                    color: 'var(--text-secondary)',
                  }}
                  title={cat}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>{formatDownloadCount(mod.downloadCount)}</span>
            <span>•</span>
            <span>{formatRelativeDate(mod.dateModified)}</span>
          </div>

          {/* Install Button */}
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="w-full px-3 py-2.5 bg-brand-green hover:bg-brand-dark text-white font-medium rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            title={isInstalling ? 'Installing...' : 'Install'}
          >
            {isInstalling ? (
              <Spinner size={18} className="animate-spin" />
            ) : (
              <>
                <DownloadSimple size={18} />
                <span>Install</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
