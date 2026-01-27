'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CurseForgeMod } from '@/types/curseforge';
import { formatDownloadCount } from '@/utils/formatters';
import { DownloadSimple, Spinner, Check } from "@phosphor-icons/react";
import { useToast } from '@/context/ToastContext';
import { useProfiles } from '@/context/ProfileContext';
import { modInstallationService } from '@/lib/services/ModInstallationService';
import { userPreferencesService } from '@/lib/services/UserPreferencesService';
import { fakeScoreService } from '@/lib/services/FakeScoreService';
import { submitFakeModReport } from '@/lib/fakeDetectionApi';
import { useDateFormatters } from '@/hooks/useDateFormatters';
import { useTranslation } from 'react-i18next';
import WarningBadge from './WarningBadge';
import FakeModWarningPopup from './FakeModWarningPopup';
import type { ModWarningStatus, FakeScoreResult, ZipAnalysis } from '@/types/fakeDetection';

interface ModListItemProps {
  mod: CurseForgeMod;
  /** Warning status for this mod (optional, fetched from backend) */
  warningStatus?: ModWarningStatus;
}

export default function ModListItem({ mod, warningStatus }: ModListItemProps) {
  const { t } = useTranslation();
  const { formatRelativeDate } = useDateFormatters();
  const authorNames = mod.authors.map((a) => a.name).join(', ');
  const categoryNames = mod.categories.slice(0, 2);
  const { showToast, updateToast } = useToast();
  const { refreshProfiles, activeProfile } = useProfiles();
  const [isInstalling, setIsInstalling] = useState(false);

  // Fake mod detection popup state
  const [showFakeWarning, setShowFakeWarning] = useState(false);
  const [fakeScoreResult, setFakeScoreResult] = useState<FakeScoreResult | null>(null);
  const [pendingInstallResolve, setPendingInstallResolve] = useState<((decision: 'install' | 'cancel' | 'report') => void) | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

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

      // Fake detection callback (only if enabled in preferences)
      const onFakeDetection = userPreferencesService.getFakeModDetection()
        ? async (
            scoreResult: FakeScoreResult,
            _zipAnalysis: ZipAnalysis
          ): Promise<'install' | 'cancel' | 'report'> => {
            return new Promise((resolve) => {
              setFakeScoreResult(scoreResult);
              setPendingInstallResolve(() => resolve);
              setShowFakeWarning(true);
            });
          }
        : undefined;

      // Start installation with fake detection (if enabled)
      const result = await modInstallationService.installMod(
        mod.id,
        modsPath,
        (progress) => {
          updateToast(toastId, {
            title: `Installing ${mod.name}`,
            message: progress.message,
            progress: progress.percent,
          });
        },
        undefined,
        onFakeDetection
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

  const handleInstallAnyway = () => {
    setShowFakeWarning(false);
    pendingInstallResolve?.('install');
    setPendingInstallResolve(null);
    setFakeScoreResult(null);
  };

  const handleReportAndCancel = async (reason: string) => {
    setIsSubmittingReport(true);
    try {
      const machineId = await fakeScoreService.getMachineId();
      await submitFakeModReport(mod.id, {
        machineId,
        reason,
        fakeScore: fakeScoreResult?.score || 0,
        creatorId: mod.authors[0]?.id,
        creatorName: mod.authors[0]?.name,
      });
      showToast({
        type: 'success',
        title: t('mods.report.submitted_title'),
        message: t('mods.report.submitted_message', { modName: mod.name }),
        duration: 3000,
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        showToast({
          type: 'info',
          title: t('mods.report.already_reported_title'),
          message: t('mods.report.already_reported_message'),
          duration: 3000,
        });
      }
    } finally {
      setIsSubmittingReport(false);
      setShowFakeWarning(false);
      pendingInstallResolve?.('report');
      setPendingInstallResolve(null);
      setFakeScoreResult(null);
    }
  };

  const handleClosePopup = () => {
    setShowFakeWarning(false);
    pendingInstallResolve?.('cancel');
    setPendingInstallResolve(null);
    setFakeScoreResult(null);
  };

  return (
    <>
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
                  {/* Warning Badge */}
                  {warningStatus && (warningStatus.hasWarning || warningStatus.creatorBanned) && (
                    <div className="absolute -top-1 -right-1 z-10">
                      <WarningBadge status={warningStatus} size="sm" />
                    </div>
                  )}
                </div>

                {/* Title and Author */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {mod.name}
                  </h3>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {t('mods.card.by')} {authorNames || t('mods.card.unknown_author')}
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
                disabled={isInstalling || isInstalled || warningStatus?.creatorBanned}
                className={`px-3 py-1.5 font-medium rounded text-sm transition-colors disabled:cursor-not-allowed cursor-pointer ${
                  isInstalled
                    ? 'bg-gray-500 text-white'
                    : 'bg-brand-green hover:bg-brand-dark text-white disabled:opacity-50'
                }`}
                title={isInstalled ? t('mods.card.already_installed') : isInstalling ? t('mods.card.installing') : t('mods.card.install')}
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

      {/* Fake Mod Warning Popup - Outside Link */}
      {fakeScoreResult && (
        <FakeModWarningPopup
          isOpen={showFakeWarning}
          onClose={handleClosePopup}
          onInstallAnyway={handleInstallAnyway}
          onReportAndCancel={handleReportAndCancel}
          modName={mod.name}
          scoreResult={fakeScoreResult}
          isSubmitting={isSubmittingReport}
        />
      )}
    </>
  );
}
