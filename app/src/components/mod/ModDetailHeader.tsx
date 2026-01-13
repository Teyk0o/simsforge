'use client';

import { useState } from 'react';
import { CurseForgeMod } from '@/types/curseforge';
import { formatRelativeDate } from '@/utils/formatters';
import { ShareNetwork, Heart, DownloadSimple, Spinner } from '@phosphor-icons/react';
import { useToast } from '@/context/ToastContext';
import { modInstallationService } from '@/lib/services/ModInstallationService';

interface ModDetailHeaderProps {
  mod: CurseForgeMod;
}

export default function ModDetailHeader({ mod }: ModDetailHeaderProps) {
  const { showToast, updateToast } = useToast();
  const [isInstalling, setIsInstalling] = useState(false);

  const authorNames = mod.authors.map((a) => a.name).join(', ');
  const categoryNames = mod.categories.slice(0, 3);
  const remainingCategories = Math.max(0, mod.categories.length - 3);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleInstall = async () => {
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
    <div className="px-6 lg:px-10 mt-8 max-w-7xl mx-auto w-full">
      {/* Header section: Logo, Title, Buttons */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Title & Meta */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              {mod.name}
            </h1>

            {/* CurseForge Badge */}
            {mod.websiteUrl && (
              <a
                href={mod.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F16436] text-white border border-[#c4491f] hover:bg-[#d65228] transition-colors text-shadow-md"
              >
                <span className="font-bold text-xs uppercase tracking-wide">
                  CurseForge
                </span>
                <span>↗</span>
              </a>
            )}
          </div>

          {/* Author and date */}
          <div className="flex items-center gap-2 text-gray-300 mb-4 font-medium text-sm">
            <span>
              By{' '}
              <span className="font-bold text-white">{authorNames || 'Unknown'}</span>
            </span>
            <span className="w-1 h-1 bg-gray-500 rounded-full" />
            <span>Updated {formatRelativeDate(mod.dateModified)}</span>
          </div>

          {/* Category tags */}
          <div className="flex gap-2 flex-wrap">
            {categoryNames.map((category, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded bg-gray-700/50 text-gray-300 text-xs font-bold border border-gray-600"
              >
                {category}
              </span>
            ))}
            {remainingCategories > 0 && (
              <span className="px-2.5 py-1 text-gray-400 text-xs font-semibold">
                +{remainingCategories} more
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col justify-end gap-3 min-w-[200px] mt-4 md:mt-0">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="w-full py-3 px-6 bg-brand-green hover:bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-green/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isInstalling ? "Installing..." : "Install"}
          >
            {isInstalling ? <Spinner size={20} className="animate-spin" /> : <DownloadSimple size={20} />}
            <span>{isInstalling ? 'Installing...' : 'Install'}</span>
          </button>

          <div className="flex gap-2">
            <button className="flex-1 py-2 px-4 bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Heart size={18} />
              Follow
            </button>
            <button
              onClick={handleShare}
              className="py-2 px-3 bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
              title="Copy link to clipboard"
            >
              <ShareNetwork size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
