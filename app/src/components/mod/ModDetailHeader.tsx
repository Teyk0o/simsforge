'use client';

import { useState } from 'react';
import { CurseForgeMod } from '@/types/curseforge';
import type { ModWarningStatus } from '@/types/fakeDetection';
import { ShareNetwork, Heart, DownloadSimple, Spinner, Check, Warning } from '@phosphor-icons/react';
import { useToast } from '@/context/ToastContext';
import { useProfiles } from '@/context/ProfileContext';
import { modInstallationService } from '@/lib/services/ModInstallationService';
import { useDateFormatters } from '@/hooks/useDateFormatters';
import { useTranslation } from 'react-i18next';
import { useCategoryLocalization } from '@/utils/categoryTranslation';
import WarningBadge from './WarningBadge';

interface ModDetailHeaderProps {
  mod: CurseForgeMod;
  warningStatus?: ModWarningStatus | null;
}

export default function ModDetailHeader({ mod, warningStatus }: ModDetailHeaderProps) {
  const { t } = useTranslation();
  const { formatRelativeDate } = useDateFormatters();
  const localizeCategory = useCategoryLocalization();
  const { showToast, updateToast } = useToast();
  const { activeProfile, refreshProfiles } = useProfiles();
  const [isInstalling, setIsInstalling] = useState(false);

  // Check if mod is already installed in the active profile
  const isInstalled = activeProfile?.mods.some((m) => m.modId === mod.id) ?? false;

  const authorNames = mod.authors.map((a) => a.name).join(', ');
  const categoryNames = mod.categories.slice(0, 3).map(cat => localizeCategory(cat));
  const remainingCategories = Math.max(0, mod.categories.length - 3);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert(t('mods.detail.header.share_copied'));
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
          title: t('mods.toasts.mods_path_not_configured'),
          message: t('mods.toasts.configure_in_settings'),
          duration: 5000,
        });
        setIsInstalling(false);
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
        setIsInstalling(false);
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
          updateToast(toastId, {
            title: t('mods.toasts.installing', { modName: mod.name }),
            message: progress.message,
            progress: progress.percent,
          });
        }
      );

      // Show result
      if (result.success) {
        updateToast(toastId, {
          type: 'success',
          title: t('mods.toasts.installation_complete'),
          message: t('mods.toasts.installed_successfully', { modName: result.modName }),
          duration: 3000,
        });
        // Refresh profiles to update the library
        await refreshProfiles();
      } else {
        updateToast(toastId, {
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

            {/* Warning Badge */}
            {warningStatus && (warningStatus.hasWarning || warningStatus.creatorBanned) && (
              <WarningBadge status={warningStatus} size="md" />
            )}

            {/* CurseForge Badge */}
            {mod.websiteUrl && (
              <a
                href={mod.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F16436] text-white border border-[#c4491f] hover:bg-[#d65228] transition-colors text-shadow-md cursor-pointer"
              >
                <span className="font-bold text-xs uppercase tracking-wide">
                  {t('mods.detail.header.curseforge_badge')}
                </span>
              </a>
            )}
          </div>

          {/* Author and date */}
          <div className="flex items-center gap-2 mb-4 font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>
              {t('mods.detail.header.by')}{' '}
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{authorNames || t('mods.detail.header.unknown_author')}</span>
            </span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-tertiary)' }} />
            <span>{t('mods.detail.header.updated', { date: formatRelativeDate(mod.dateModified) })}</span>
          </div>

          {/* Category tags */}
          <div className="flex gap-2 flex-wrap">
            {categoryNames.map((category, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded text-xs font-bold"
                style={{
                  backgroundColor: 'var(--ui-hover)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--ui-border)',
                }}
              >
                {category}
              </span>
            ))}
            {remainingCategories > 0 && (
              <span className="px-2.5 py-1 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                {t('mods.detail.header.more_categories', { count: remainingCategories })}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col justify-end gap-3 min-w-[200px] mt-4 md:mt-0">
          <button
            onClick={handleInstall}
            disabled={isInstalling || isInstalled || warningStatus?.creatorBanned}
            className={`w-full py-3 px-6 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:cursor-not-allowed cursor-pointer ${
              isInstalled
                ? 'bg-gray-500 text-white shadow-gray-500/25'
                : 'bg-brand-green hover:bg-brand-dark text-white shadow-brand-green/25 disabled:opacity-50'
            }`}
            title={isInstalled ? t('mods.detail.header.already_installed') : isInstalling ? t('mods.detail.header.installing') : t('mods.detail.header.install')}
          >
            {isInstalled ? (
              <>
                <Check size={20} weight="bold" />
                <span>{t('mods.detail.header.installed')}</span>
              </>
            ) : isInstalling ? (
              <>
                <Spinner size={20} className="animate-spin" />
                <span>{t('mods.detail.header.installing')}</span>
              </>
            ) : (
              <>
                <DownloadSimple size={20} />
                <span>{t('mods.detail.header.install')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {warningStatus && (warningStatus.hasWarning || warningStatus.creatorBanned) && (
        <div
          className="mt-6 p-6 rounded-lg border-2 flex gap-4 items-start"
          style={{
            backgroundColor: warningStatus.creatorBanned ? '#7f1d1d' : '#78350f',
            borderColor: warningStatus.creatorBanned ? '#ef4444' : '#f59e0b',
          }}
        >
          <Warning
            size={32}
            weight="fill"
            style={{
              color: warningStatus.creatorBanned ? '#ef4444' : '#f59e0b',
              flexShrink: 0,
            }}
          />
          <div className="flex-1">
            <h3
              className="text-lg font-bold mb-2"
              style={{
                color: warningStatus.creatorBanned ? '#fca5a5' : '#fbbf24',
              }}
            >
              {warningStatus.creatorBanned ? t('mods.warnings.creator_banned') : t('mods.warnings.suspicious_mod')}
            </h3>
            <p
              className="text-sm mb-3"
              style={{
                color: warningStatus.creatorBanned ? '#f8d7da' : '#fed7aa',
              }}
            >
              {warningStatus.creatorBanned
                ? t('mods.warnings.banned_message')
                : warningStatus.isAutoWarned
                  ? t('mods.warnings.auto_warning_message', { reason: warningStatus.warningReason || 'No valid mod files detected' })
                  : t('mods.warnings.user_reports_message', { count: warningStatus.reportCount })}
            </p>
            {warningStatus.warningReason && !warningStatus.creatorBanned && (
              <p
                className="text-xs italic"
                style={{
                  color: warningStatus.creatorBanned ? '#f8d7da' : '#fed7aa',
                  opacity: 0.8,
                }}
              >
                {warningStatus.warningReason}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
