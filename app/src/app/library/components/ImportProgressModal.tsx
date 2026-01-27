/**
 * ImportProgressModal Component
 *
 * Shows progress during local mod import and displays results
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, WarningCircle, Spinner } from '@phosphor-icons/react';
import type { ImportSummary } from '@/lib/services/LocalModImportService';

interface ImportProgressModalProps {
  isOpen: boolean;
  progress: {
    currentFile: string;
    currentIndex: number;
    totalFiles: number;
    stage: 'analyzing' | 'extracting' | 'installing' | 'complete';
  };
  summary: ImportSummary | null;
  onClose: () => void;
}

export const ImportProgressModal: React.FC<ImportProgressModalProps> = ({
  isOpen,
  progress,
  summary,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isComplete = summary !== null;
  const canClose = isComplete;

  const getStageLabel = (stage: string): string => {
    switch (stage) {
      case 'analyzing':
        return 'Analyzing';
      case 'extracting':
        return 'Extracting';
      case 'installing':
        return 'Installing';
      case 'complete':
        return 'Complete';
      default:
        return stage;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) {
          onClose();
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
            {isComplete
              ? t('library.import_progress.complete')
              : t('library.import_progress.title')}
          </h2>
          {canClose && (
            <button
              onClick={onClose}
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
          {!isComplete ? (
            <div className="space-y-4">
              {/* Progress Info */}
              <div className="flex items-center gap-3">
                <Spinner size={24} className="animate-spin" style={{ color: '#46C89B' }} />
                <div className="flex-1">
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t('library.import_progress.processing', {
                      current: progress.currentIndex,
                      total: progress.totalFiles,
                    })}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {progress.currentFile}
                  </p>
                </div>
              </div>

              {/* Stage */}
              <div>
                <p
                  className="text-xs mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {getStageLabel(progress.stage)}
                </p>
                {/* Progress bar */}
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--ui-hover)' }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(progress.currentIndex / progress.totalFiles) * 100}%`,
                      backgroundColor: '#46C89B',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3">
                {summary.successful > 0 ? (
                  <CheckCircle size={32} weight="fill" style={{ color: '#46C89B' }} />
                ) : (
                  <WarningCircle size={32} weight="fill" style={{ color: '#ef4444' }} />
                )}
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('library.import_progress.summary', {
                    successful: summary.successful,
                    total: summary.total,
                  })}
                </p>
              </div>

              {/* Errors list */}
              {summary.errors.length > 0 && (
                <div
                  className="p-3 rounded border"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <h3
                    className="text-sm font-medium mb-2"
                    style={{ color: '#ef4444' }}
                  >
                    Errors ({summary.errors.length}):
                  </h3>
                  <ul className="space-y-1">
                    {summary.errors.map((error, index) => (
                      <li
                        key={index}
                        className="text-xs"
                        style={{ color: '#ef4444' }}
                      >
                        <strong>{error.fileName}</strong>: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isComplete && (
          <div
            className="p-4 border-t"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded transition-colors font-medium text-white cursor-pointer"
              style={{
                backgroundColor: '#46C89B',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3fb889';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#46C89B';
              }}
            >
              {t('common.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
