'use client';

import { CurseForgeMod } from '@/types/curseforge';
import { formatDownloadCount, formatFileSize } from '@/utils/formatters';
import { Warning } from '@phosphor-icons/react';
import WarningBadge from './WarningBadge';
import ReportButton from './ReportButton';
import { userPreferencesService } from '@/lib/services/UserPreferencesService';
import { useTranslation } from 'react-i18next';
import type { ModWarningStatus } from '@/types/fakeDetection';

interface ModDetailSidebarProps {
  mod: CurseForgeMod;
  /** Warning status for this mod (optional, fetched from backend) */
  warningStatus?: ModWarningStatus;
}

export default function ModDetailSidebar({ mod, warningStatus }: ModDetailSidebarProps) {
  const { t } = useTranslation();
  const latestFile = mod.latestFiles?.[0];
  const version = latestFile?.displayName || t('mods.detail.header.unknown_author');
  const fileSize = latestFile?.fileLength ? formatFileSize(latestFile.fileLength) : t('mods.detail.header.unknown_author');

  return (
    <div className="w-full lg:w-80 flex flex-col gap-6">
      {/* Warning Card (if applicable) */}
      {warningStatus && (warningStatus.hasWarning || warningStatus.creatorBanned) && (
        <div
          className="rounded-xl p-5 shadow-sm border"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderColor: '#f59e0b'
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Warning size={24} weight="fill" color="#f59e0b" />
            <h3 className="font-bold text-amber-400">{t('mods.detail.sidebar.warning_title')}</h3>
          </div>
          <WarningBadge status={warningStatus} size="md" showText className="mb-3" />
          <p className="text-sm text-gray-400">
            {warningStatus.warningReason ||
              (warningStatus.creatorBanned
                ? t('mods.detail.sidebar.warning_banned_message')
                : t('mods.detail.sidebar.warning_reported_message', { count: warningStatus.reportCount }))}
          </p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-ui-panel border border-ui-border rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-white mb-4">{t('mods.detail.sidebar.information')}</h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
            <span className="text-sm text-gray-400">{t('mods.detail.sidebar.size')}</span>
            <span className="text-sm font-semibold text-white">{fileSize}</span>
          </div>

          <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
            <span className="text-sm text-gray-400">{t('mods.detail.sidebar.downloads')}</span>
            <span className="text-sm font-semibold text-white">
              {formatDownloadCount(mod.downloadCount)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">{t('mods.detail.sidebar.license')}</span>
            {mod.websiteUrl ? (
              <a
                href={mod.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-brand-green hover:text-brand-dark transition-colors cursor-pointer"
              >
                {t('mods.detail.sidebar.view_on_curseforge')}
              </a>
            ) : (
              <span className="text-sm font-semibold text-gray-500">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Dependencies */}
      <div className="bg-ui-panel border border-ui-border rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-white mb-4">{t('mods.detail.sidebar.dependencies')}</h3>
        <p className="text-sm text-gray-400 mb-3">{t('mods.detail.sidebar.no_dependencies')}</p>
        <h4 className="font-bold text-white text-sm mb-3">{t('mods.detail.sidebar.recommended')}</h4>
        <p className="text-xs text-gray-500">
          {mod.websiteUrl ? (
            <a
              href={mod.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-green hover:text-brand-dark cursor-pointer"
            >
              {t('mods.detail.sidebar.view_recommendations')}
            </a>
          ) : (
            t('mods.detail.sidebar.na')
          )}
        </p>
      </div>

      {/* Report Section (only shown when fake mod detection is enabled) */}
      {userPreferencesService.getFakeModDetection() && (
        <div className="bg-ui-panel border border-ui-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-white mb-3">{t('mods.detail.sidebar.report_title')}</h3>
          <p className="text-sm text-gray-400 mb-4">
            {t('mods.detail.sidebar.report_description')}
          </p>
          <ReportButton
            modId={mod.id}
            modName={mod.name}
            creatorId={mod.authors[0]?.id}
            creatorName={mod.authors[0]?.name}
            className="w-full justify-center"
          />
        </div>
      )}
    </div>
  );
}
