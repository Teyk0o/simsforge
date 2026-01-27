'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CurseForgeMod } from '@/types/curseforge';
import { formatFileSize } from '@/utils/formatters';
import { Download, Spinner } from '@phosphor-icons/react';
import ImageLightbox from '@/components/mod/ImageLightbox';
import { useToast } from '@/context/ToastContext';
import { useProfiles } from '@/context/ProfileContext';
import { modInstallationService } from '@/lib/services/ModInstallationService';
import { useDateFormatters } from '@/hooks/useDateFormatters';
import { useTranslation } from 'react-i18next';

interface ModDetailTabsProps {
  mod: CurseForgeMod;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

type TabId = 'description' | 'files' | 'images' | 'changelog';

export default function ModDetailTabs({ mod, activeTab, onTabChange }: ModDetailTabsProps) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormatters();
  const { showToast } = useToast();
  const { refreshProfiles } = useProfiles();
  const [lightboxImage, setLightboxImage] = useState<number | null>(null);
  const [installingFileId, setInstallingFileId] = useState<number | null>(null);

  const tabs = [
    { id: 'description' as TabId, label: t('mods.detail.tabs.description') },
    { id: 'files' as TabId, label: t('mods.detail.tabs.files') },
    { id: 'images' as TabId, label: t('mods.detail.tabs.images') },
    { id: 'changelog' as TabId, label: t('mods.detail.tabs.changelog'), disabled: true },
  ];

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
          title: t('mods.toasts.mods_path_not_configured'),
          message: t('mods.toasts.configure_in_settings'),
          duration: 5000,
        });
        setInstallingFileId(null);
        return;
      }

      const modsPath = await StorageHelper.decryptData(encryptedModsPath);
      if (!modsPath) {
        showToast({
          type: 'error',
          title: t('mods.toasts.failed_to_read_path'),
          message: t('mods.toasts.reconfigure_in_settings'),
          duration: 5000,
        });
        setInstallingFileId(null);
        return;
      }

      // Show initial toast
      const toastId = showToast({
        type: 'download',
        title: t('mods.toasts.installing', { modName: mod.name }),
        message: t('mods.toasts.starting_download'),
        progress: 0,
        duration: 0, // Don't auto-dismiss
      });

      // Start installation
      const result = await modInstallationService.installMod(
        mod.id,
        modsPath,
        (progress) => {
          showToast({
            type: 'info',
            title: t('mods.toasts.installing', { modName: mod.name }),
            message: progress.message,
            duration: 0,
          });
        }
      );

      // Show result
      if (result.success) {
        showToast({
          type: 'success',
          title: t('mods.toasts.installation_complete'),
          message: t('mods.toasts.installed_successfully', { modName: result.modName }),
          duration: 3000,
        });
        // Refresh profiles to update the library
        await refreshProfiles();
      } else {
        showToast({
          type: 'error',
          title: t('mods.toasts.installation_failed'),
          message: result.error || t('mods.toasts.unknown_error'),
          duration: 3000,
        });
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: t('mods.toasts.installation_failed'),
        message: error.message || t('mods.toasts.unexpected_error'),
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
      <div className="flex border-b mb-6 overflow-x-auto" style={{ borderColor: 'var(--ui-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-b-2 border-brand-green text-brand-green'
                : 'disabled:cursor-not-allowed'
            } ${tab.disabled ? 'opacity-50' : ''}`}
            style={{
              color: activeTab === tab.id ? undefined : 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!tab.disabled && activeTab !== tab.id) {
                e.currentTarget.style.color = '#46C89B';
              }
            }}
            onMouseLeave={(e) => {
              if (!tab.disabled && activeTab !== tab.id) {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            {tab.label}
            {(tab.id === 'files' || tab.id === 'images') && tabCount[tab.id] > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'var(--ui-hover)', color: 'var(--text-secondary)' }}>
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
          <div className="prose max-w-none" style={{ color: 'var(--text-primary)' }}>
            {/* Summary */}
            <p className="lead text-lg font-semibold mb-4">{mod.summary}</p>

            {/* Full description */}
            {mod.description ? (
              <div
                className="leading-relaxed space-y-3 mb-4"
                style={{ color: 'var(--text-primary)' }}
                dangerouslySetInnerHTML={{
                  __html: mod.description
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/^/, '<p>')
                    .replace(/$/, '</p>')
                    .replace(/<p><\/p>/g, ''),
                }}
              />
            ) : (
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'var(--ui-hover)', color: 'var(--text-primary)', borderColor: 'var(--ui-border)' }}>
                <p className="mb-2">{t('mods.detail.tabs.no_description_message')}</p>
                {mod.websiteUrl && (
                  <a
                    href={mod.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-brand-green hover:text-brand-dark transition-colors font-semibold cursor-pointer"
                  >
                    {t('mods.detail.tabs.view_on_curseforge')}
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
              <table className="w-full text-sm" style={{ color: 'var(--text-secondary)' }}>
                <thead>
                  <tr style={{ borderColor: 'var(--ui-border)' }} className="border-b">
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{t('mods.detail.tabs.table_name')}</th>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{t('mods.detail.tabs.table_date')}</th>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{t('mods.detail.tabs.table_size')}</th>
                    <th className="text-center py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{t('mods.detail.tabs.table_action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...mod.latestFiles]
                    .sort((a, b) => new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime())
                    .map((file, index) => (
                      <tr
                        key={file.id}
                        className="border-b transition-colors"
                        style={{
                          backgroundColor: index === 0 ? 'var(--ui-hover)' : 'transparent',
                          borderColor: 'var(--ui-border)',
                        }}
                      >
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{file.displayName}</span>
                            {index === 0 && (
                              <span className="inline-block px-2 py-0.5 bg-brand-green/20 text-brand-green text-xs font-semibold rounded whitespace-nowrap">
                                {t('mods.detail.tabs.latest_badge')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{formatDate(file.fileDate)}</td>
                        <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                          {formatFileSize(file.fileLength)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleInstallFile(file)}
                            disabled={installingFileId === file.id}
                            className="inline-flex items-center gap-1 text-brand-green hover:text-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title={installingFileId === file.id ? t('mods.detail.tabs.installing_file') : t('mods.detail.tabs.install_file')}
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
              <p className="py-8" style={{ color: 'var(--text-secondary)' }}>{t('mods.detail.tabs.no_files')}</p>
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
                    className="relative h-48 rounded-xl overflow-hidden group cursor-pointer"
                    style={{ backgroundColor: 'var(--ui-dark)' }}
                    onClick={() => setLightboxImage(index)}
                  >
                    <Image
                      src={screenshot}
                      alt={t('mods.detail.tabs.screenshot_alt', { index: index + 1 })}
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
              <p className="py-8" style={{ color: 'var(--text-secondary)' }}>{t('mods.detail.tabs.no_images')}</p>
            )}
          </div>
        )}

        {/* Changelog Tab */}
        {activeTab === 'changelog' && (
          <div className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-lg font-semibold mb-2">{t('mods.detail.tabs.coming_soon')}</p>
            <p className="text-sm">{t('mods.detail.tabs.changelog_message')}</p>
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
