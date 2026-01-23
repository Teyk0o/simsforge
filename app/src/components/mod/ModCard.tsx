/**
 * Mod Card Component for Grid View
 *
 * Vertical card displaying mod with image, title, and installation
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DownloadSimple, Spinner, Check } from '@phosphor-icons/react';
import { CurseForgeMod } from '@/types/curseforge';
import { useToast } from '@/context/ToastContext';
import { useProfiles } from '@/context/ProfileContext';
import { modInstallationService } from '@/lib/services/ModInstallationService';
import { userPreferencesService } from '@/lib/services/UserPreferencesService';
import { formatDownloadCount, formatRelativeDate } from '@/utils/formatters';
import { fakeScoreService } from '@/lib/services/FakeScoreService';
import { submitFakeModReport } from '@/lib/fakeDetectionApi';
import WarningBadge from './WarningBadge';
import FakeModWarningPopup from './FakeModWarningPopup';
import type { ModWarningStatus, FakeScoreResult, ZipAnalysis } from '@/types/fakeDetection';

interface ModCardProps {
  mod: CurseForgeMod;
  /** Warning status for this mod (optional, fetched from backend) */
  warningStatus?: ModWarningStatus;
}

/**
 * Card component for grid view
 * Displays mod with prominent image, title, summary, and install button
 */
export default function ModCard({ mod, warningStatus }: ModCardProps) {
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

      // Fake detection callback - shows popup and waits for user decision
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
        undefined, // fileId
        onFakeDetection
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

  /**
   * Handle "Install Anyway" from fake warning popup
   */
  const handleInstallAnyway = () => {
    setShowFakeWarning(false);
    pendingInstallResolve?.('install');
    setPendingInstallResolve(null);
    setFakeScoreResult(null);
  };

  /**
   * Handle "Report and Cancel" from fake warning popup
   */
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
        title: 'Report Submitted',
        message: `Thank you for reporting "${mod.name}"`,
        duration: 3000,
      });
    } catch (error: any) {
      if (error.response?.status === 409) {
        showToast({
          type: 'info',
          title: 'Already Reported',
          message: 'You have already reported this mod',
          duration: 3000,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Report Failed',
          message: 'Could not submit report',
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

  /**
   * Handle popup close without action
   */
  const handleClosePopup = () => {
    setShowFakeWarning(false);
    pendingInstallResolve?.('cancel');
    setPendingInstallResolve(null);
    setFakeScoreResult(null);
  };

  return (
    <>
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

            {/* Warning Badge */}
            {warningStatus && (warningStatus.hasWarning || warningStatus.creatorBanned) && (
              <div className="absolute top-2 right-2 z-10">
                <WarningBadge status={warningStatus} size="sm" />
              </div>
            )}
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
              disabled={isInstalling || isInstalled || warningStatus?.creatorBanned}
              className={`w-full px-3 py-2.5 font-medium rounded text-sm transition-colors disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 ${
                isInstalled
                  ? 'bg-gray-500 text-white'
                  : 'bg-brand-green hover:bg-brand-dark text-white disabled:opacity-50'
              }`}
              title={isInstalled ? 'Already installed' : isInstalling ? 'Installing...' : 'Install'}
            >
              {isInstalled ? (
                <>
                  <Check size={18} weight="bold" />
                  <span>Installed</span>
                </>
              ) : isInstalling ? (
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
