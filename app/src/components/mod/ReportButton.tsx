'use client';

import { useState } from 'react';
import { Flag, X } from '@phosphor-icons/react';
import { useToast } from '@/context/ToastContext';
import { submitFakeModReport } from '@/lib/fakeDetectionApi';
import { fakeScoreService } from '@/lib/services/FakeScoreService';
import { useTranslation } from 'react-i18next';

interface ReportButtonProps {
  /** CurseForge mod ID */
  modId: number;
  /** Mod display name */
  modName: string;
  /** CurseForge creator ID */
  creatorId?: number;
  /** Creator display name */
  creatorName?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button to report a mod as fake
 * Opens a modal for the user to provide a reason
 */
export default function ReportButton({
  modId,
  modName,
  creatorId,
  creatorName,
  className = '',
}: ReportButtonProps) {
  const { t } = useTranslation();
  const [isReporting, setIsReporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [mainButtonHover, setMainButtonHover] = useState(false);
  const [cancelButtonHover, setCancelButtonHover] = useState(false);
  const [submitButtonHover, setSubmitButtonHover] = useState(false);
  const { showToast } = useToast();

  const handleReport = async () => {
    if (isReporting) return;

    try {
      setIsReporting(true);

      const machineId = await fakeScoreService.getMachineId();

      await submitFakeModReport(modId, {
        machineId,
        reason: reason || 'User reported as suspicious',
        fakeScore: 0, // Score not available from detail page
        creatorId,
        creatorName,
      });

      showToast({
        type: 'success',
        title: t('mods.report.submitted_title'),
        message: t('mods.report.submitted_message', { modName }),
        duration: 3000,
      });

      setShowModal(false);
      setReason('');
    } catch (error: any) {
      // Check for 409 Conflict (already reported)
      if (error.response?.status === 409) {
        showToast({
          type: 'info',
          title: t('mods.report.already_reported_title'),
          message: t('mods.report.already_reported_message'),
          duration: 3000,
        });
      } else {
        showToast({
          type: 'error',
          title: t('mods.report.failed_title'),
          message: error.message || t('mods.report.failed_message'),
          duration: 3000,
        });
      }
    } finally {
      setIsReporting(false);
    }
  };

  const handleClose = () => {
    if (!isReporting) {
      setShowModal(false);
      setReason('');
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        onMouseEnter={() => setMainButtonHover(true)}
        onMouseLeave={() => setMainButtonHover(false)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm cursor-pointer ${className}`}
        style={{
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--ui-hover)',
          filter: mainButtonHover ? 'brightness(1.2)' : 'brightness(1)',
          transition: 'filter 0.2s ease-in-out',
        }}
        title={t('mods.report.button_title')}
      >
        <Flag size={16} />
        {t('mods.report.button_text')}
      </button>

      {/* Report Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleClose}
        >
          <div
            className="rounded-lg shadow-xl max-w-sm w-full border"
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
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('mods.report.modal_title')}
              </h3>
              <button
                onClick={handleClose}
                disabled={isReporting}
                className="p-1 rounded transition-colors hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('mods.report.modal_message_prefix')} <strong style={{ color: 'var(--text-primary)' }}>{modName}</strong>{' '}
                {t('mods.report.modal_message_suffix')}
              </p>

              <div>
                <label
                  className="text-sm mb-1 block"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('mods.report.reason_label')}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('mods.report.reason_placeholder')}
                  className="w-full rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                  style={{
                    backgroundColor: 'var(--ui-dark)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                  rows={3}
                  disabled={isReporting}
                />
              </div>
            </div>

            {/* Actions */}
            <div
              className="flex gap-2 p-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={handleClose}
                disabled={isReporting}
                onMouseEnter={() => setCancelButtonHover(true)}
                onMouseLeave={() => setCancelButtonHover(false)}
                className="flex-1 px-4 py-2 rounded font-medium cursor-pointer disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--ui-hover)',
                  color: 'var(--text-primary)',
                  opacity: isReporting ? 0.5 : 1,
                  filter: cancelButtonHover && !isReporting ? 'brightness(1.2)' : 'brightness(1)',
                  transition: 'filter 0.2s ease-in-out',
                }}
              >
                {t('mods.report.cancel')}
              </button>
              <button
                onClick={handleReport}
                disabled={isReporting}
                onMouseEnter={() => setSubmitButtonHover(true)}
                onMouseLeave={() => setSubmitButtonHover(false)}
                className="flex-1 px-4 py-2 rounded font-medium text-white cursor-pointer disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#ef4444',
                  opacity: isReporting ? 0.5 : 1,
                  filter: submitButtonHover && !isReporting ? 'brightness(1.2)' : 'brightness(1)',
                  transition: 'filter 0.2s ease-in-out',
                }}
              >
                {isReporting ? t('mods.report.submitting') : t('mods.report.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
