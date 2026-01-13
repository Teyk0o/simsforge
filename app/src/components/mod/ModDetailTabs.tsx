'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CurseForgeMod } from '@/types/curseforge';
import { formatFileSize, formatDate } from '@/utils/formatters';
import { Download, Spinner } from '@phosphor-icons/react';
import ImageLightbox from '@/components/mod/ImageLightbox';
import { useToast } from '@/context/ToastContext';
import { modInstallationService } from '@/lib/services/ModInstallationService';

interface ModDetailTabsProps {
  mod: CurseForgeMod;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

type TabId = 'description' | 'files' | 'images' | 'changelog';

const tabs = [
  { id: 'description' as TabId, label: 'Description' },
  { id: 'files' as TabId, label: 'Files' },
  { id: 'images' as TabId, label: 'Images' },
  { id: 'changelog' as TabId, label: 'Changelog', disabled: true },
];

export default function ModDetailTabs({ mod, activeTab, onTabChange }: ModDetailTabsProps) {
  const { showToast } = useToast();
  const [lightboxImage, setLightboxImage] = useState<number | null>(null);
  const [installingFileId, setInstallingFileId] = useState<number | null>(null);

  const handleInstallFile = async (file: any) => {
    if (installingFileId === file.id) return;

    try {
      setInstallingFileId(file.id);

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
        setInstallingFileId(null);
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
        setInstallingFileId(null);
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
          showToast({
            id: toastId,
            type: 'download',
            title: `Installing ${mod.name}`,
            message: progress.message,
            progress: progress.percent,
            duration: 0,
          });
        }
      );

      // Show result
      if (result.success) {
        showToast({
          id: toastId,
          type: 'success',
          title: 'Installation complete!',
          message: `${result.modName} has been installed successfully`,
          duration: 3000,
        });
      } else {
        showToast({
          id: toastId,
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
      setInstallingFileId(null);
    }
  };

  const tabCount = {
    files: mod.latestFiles?.length || 0,
    images: mod.screenshots?.length || 0,
  };

  return (
    <div className="flex-1">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-brand-green text-brand-green'
                : 'text-gray-400 hover:text-gray-200 disabled:cursor-not-allowed'
            } ${tab.disabled ? 'opacity-50' : ''}`}
          >
            {tab.label}
            {(tab.id === 'files' || tab.id === 'images') && tabCount[tab.id] > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-700 text-xs text-gray-300">
                {tabCount[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {/* Description Tab */}
        {activeTab === 'description' && (
          <div className="prose dark:prose-invert max-w-none text-gray-300">
            {/* Summary */}
            <p className="lead text-lg font-semibold mb-4">{mod.summary}</p>

            {/* Full description */}
            {mod.description ? (
              <div
                className="text-gray-300 leading-relaxed space-y-3 mb-4"
                dangerouslySetInnerHTML={{
                  __html: mod.description
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/^/, '<p>')
                    .replace(/$/, '</p>')
                    .replace(/<p><\/p>/g, ''),
                }}
              />
            ) : (
              <div className="bg-ui-hover/50 border border-ui-border rounded-lg p-4 text-gray-300">
                <p className="mb-2">This mod is sourced from the CurseForge API. For detailed information, visit the mod page on CurseForge:</p>
                {mod.websiteUrl && (
                  <a
                    href={mod.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-brand-green hover:text-brand-dark transition-colors font-semibold"
                  >
                    View on CurseForge
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="overflow-x-auto">
            {mod.latestFiles && mod.latestFiles.length > 0 ? (
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-white">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-white">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-white">Size</th>
                    <th className="text-center py-3 px-4 font-semibold text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[...mod.latestFiles]
                    .sort((a, b) => new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime())
                    .map((file, index) => (
                      <tr
                        key={file.id}
                        className={`border-b transition-colors ${
                          index === 0 ? 'bg-gray-800/20 hover:bg-gray-800/40' : 'border-gray-800 hover:bg-gray-800/30'
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{file.displayName}</span>
                            {index === 0 && (
                              <span className="inline-block px-2 py-0.5 bg-brand-green/20 text-brand-green text-xs font-semibold rounded whitespace-nowrap">
                                Latest
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-400">{formatDate(file.fileDate)}</td>
                        <td className="py-3 px-4 text-gray-400">
                          {formatFileSize(file.fileLength)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleInstallFile(file)}
                            disabled={installingFileId === file.id}
                            className="inline-flex items-center gap-1 text-brand-green hover:text-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={installingFileId === file.id ? "Installing..." : "Install file"}
                          >
                            {installingFileId === file.id ? (
                              <Spinner size={16} className="animate-spin" />
                            ) : (
                              <Download size={16} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 py-8">No files available.</p>
            )}
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div>
            {mod.screenshots && mod.screenshots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mod.screenshots.map((screenshot, index) => (
                  <div
                    key={index}
                    className="relative h-48 rounded-xl overflow-hidden bg-gray-800 group cursor-pointer"
                    onClick={() => setLightboxImage(index)}
                  >
                    <Image
                      src={screenshot}
                      alt={`Screenshot ${index + 1}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 py-8">No images available.</p>
            )}
          </div>
        )}

        {/* Changelog Tab */}
        {activeTab === 'changelog' && (
          <div className="text-gray-400 py-8 text-center">
            <p className="text-lg font-semibold mb-2">Coming soon</p>
            <p className="text-sm">Changelog view will be available in the next update.</p>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxImage !== null && mod.screenshots && mod.screenshots.length > 0 && (
        <ImageLightbox
          images={mod.screenshots}
          initialIndex={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
