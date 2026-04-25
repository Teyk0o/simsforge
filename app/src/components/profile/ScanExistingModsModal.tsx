'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  CheckCircle,
  WarningCircle,
  Spinner,
  MagnifyingGlass,
  FolderOpen,
} from '@phosphor-icons/react';
import {
  existingModScanService,
  type ScanProgress,
  type ScanImportResult,
} from '@/lib/services/ExistingModScanService';

interface ScanExistingModsModalProps {
  isOpen: boolean;
  modsPath: string;
  onClose: () => void;
  onComplete: () => void;
}

type ModalState = 'confirm' | 'scanning' | 'complete';

export const ScanExistingModsModal: React.FC<ScanExistingModsModalProps> = ({
  isOpen,
  modsPath,
  onClose,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<ModalState>('confirm');
  const [progress, setProgress] = useState<ScanProgress>({
    phase: 'scanning',
    current: 0,
    total: 0,
    currentName: '',
    imported: 0,
    skipped: 0,
    errors: 0,
  });
  const [result, setResult] = useState<ScanImportResult | null>(null);

  const handleStart = useCallback(async () => {
    setState('scanning');

    try {
      const importResult = await existingModScanService.scanAndImport(
        modsPath,
        (p) => setProgress(p)
      );
      setResult(importResult);
      setState('complete');
    } catch (error) {
      setResult({
        profileId: '',
        profileName: '',
        imported: 0,
        skipped: 0,
        errors: [
          {
            name: 'scan',
            error: error instanceof Error ? error.message : String(error),
          },
        ],
        totalFiles: 0,
      });
      setState('complete');
    }
  }, [modsPath]);

  const handleClose = useCallback(() => {
    if (state === 'scanning') return;
    if (state === 'complete' && result && result.imported > 0) {
      onComplete();
    }
    setState('confirm');
    setResult(null);
    onClose();
  }, [state, result, onComplete, onClose]);

  if (!isOpen) return null;

  const progressPercent =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (state !== 'scanning' && e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="rounded-lg shadow-xl max-w-md w-full border"
        style={{
          backgroundColor: 'var(--ui-panel)',
          borderColor: 'var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {state === 'complete'
              ? t('scan.complete_title', 'Import Complete')
              : t('scan.title', 'Scan Existing Mods')}
          </h2>
          {state !== 'scanning' && (
            <button
              onClick={handleClose}
              className="p-1 rounded transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {state === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FolderOpen
                  size={32}
                  weight="duotone"
                  style={{ color: '#46C89B', flexShrink: 0 }}
                />
                <div>
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t(
                      'scan.confirm_message',
                      'SimsForge will scan your Sims 4 Mods folder for existing mods and import them into a new profile.'
                    )}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t(
                      'scan.confirm_detail',
                      'Mods in subfolders will be grouped together. Loose files will be imported individually. Your original files will not be modified.'
                    )}
                  </p>
                </div>
              </div>

              <div
                className="p-3 rounded text-xs font-mono truncate"
                style={{
                  backgroundColor: 'var(--ui-hover)',
                  color: 'var(--text-secondary)',
                }}
              >
                {modsPath}
              </div>
            </div>
          )}

          {state === 'scanning' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {progress.phase === 'scanning' ? (
                  <MagnifyingGlass
                    size={24}
                    className="animate-pulse"
                    style={{ color: '#46C89B' }}
                  />
                ) : (
                  <Spinner
                    size={24}
                    className="animate-spin"
                    style={{ color: '#46C89B' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {progress.phase === 'scanning'
                      ? t('scan.scanning', 'Scanning mods...')
                      : t('scan.importing', {
                          current: progress.current,
                          total: progress.total,
                          defaultValue: `Importing {{current}} / {{total}}...`,
                        })}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {progress.currentName}
                  </p>
                </div>
              </div>

              {progress.phase === 'importing' && (
                <div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--ui-hover)' }}
                  >
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: '#46C89B',
                      }}
                    />
                  </div>
                  <div
                    className="flex justify-between mt-2 text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span>
                      {progress.imported} {t('scan.imported', 'imported')}
                    </span>
                    {progress.skipped > 0 && (
                      <span>
                        {progress.skipped}{' '}
                        {t('scan.already_cached', 'already cached')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {state === 'complete' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {result.imported > 0 ? (
                  <CheckCircle
                    size={32}
                    weight="fill"
                    style={{ color: '#46C89B' }}
                  />
                ) : (
                  <WarningCircle
                    size={32}
                    weight="fill"
                    style={{ color: '#ef4444' }}
                  />
                )}
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {result.imported > 0
                      ? t('scan.success_message', {
                          imported: result.imported,
                          files: result.totalFiles,
                          profile: result.profileName,
                          defaultValue: `{{imported}} mods ({{files}} files) imported into "{{profile}}"`,
                        })
                      : t(
                          'scan.no_mods_found',
                          'No mods found in the Mods folder.'
                        )}
                  </p>
                  {result.skipped > 0 && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {t('scan.skipped_message', {
                        count: result.skipped,
                        defaultValue: '{{count}} already in cache (skipped)',
                      })}
                    </p>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div
                  className="p-3 rounded border max-h-32 overflow-y-auto"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <h3
                    className="text-sm font-medium mb-2"
                    style={{ color: '#ef4444' }}
                  >
                    {t('scan.errors_title', {
                      count: result.errors.length,
                      defaultValue: 'Errors ({{count}}):',
                    })}
                  </h3>
                  <ul className="space-y-1">
                    {result.errors.map((err, index) => (
                      <li
                        key={index}
                        className="text-xs"
                        style={{ color: '#ef4444' }}
                      >
                        <strong>{err.name}</strong>: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {state === 'confirm' && (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 rounded transition-colors font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--ui-hover)',
                  color: 'var(--text-primary)',
                }}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-4 py-2 rounded transition-colors font-medium text-white cursor-pointer"
                style={{ backgroundColor: '#46C89B' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3fb889';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#46C89B';
                }}
              >
                {t('scan.start_button', 'Scan & Import')}
              </button>
            </div>
          )}

          {state === 'complete' && (
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 rounded transition-colors font-medium text-white cursor-pointer"
              style={{ backgroundColor: '#46C89B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3fb889';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#46C89B';
              }}
            >
              {t('common.close', 'Close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
