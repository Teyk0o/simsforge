'use client';

import { CurseForgeMod } from '@/types/curseforge';
import { formatDownloadCount, formatFileSize } from '@/utils/formatters';
import { Warning } from '@phosphor-icons/react';
import WarningBadge from './WarningBadge';
import ReportButton from './ReportButton';
import { userPreferencesService } from '@/lib/services/UserPreferencesService';
import type { ModWarningStatus } from '@/types/fakeDetection';

interface ModDetailSidebarProps {
  mod: CurseForgeMod;
  /** Warning status for this mod (optional, fetched from backend) */
  warningStatus?: ModWarningStatus;
}

export default function ModDetailSidebar({ mod, warningStatus }: ModDetailSidebarProps) {
  const latestFile = mod.latestFiles?.[0];
  const version = latestFile?.displayName || 'Unknown';
  const fileSize = latestFile?.fileLength ? formatFileSize(latestFile.fileLength) : 'Unknown';

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
            <h3 className="font-bold text-amber-400">Warning</h3>
          </div>
          <WarningBadge status={warningStatus} size="md" showText className="mb-3" />
          <p className="text-sm text-gray-400">
            {warningStatus.warningReason ||
              (warningStatus.creatorBanned
                ? 'This creator has been banned due to multiple fake mods.'
                : `This mod has been reported by ${warningStatus.reportCount} users.`)}
          </p>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-ui-panel border border-ui-border rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-white mb-4">Information</h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
            <span className="text-sm text-gray-400">Size</span>
            <span className="text-sm font-semibold text-white">{fileSize}</span>
          </div>

          <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
            <span className="text-sm text-gray-400">Downloads</span>
            <span className="text-sm font-semibold text-white">
              {formatDownloadCount(mod.downloadCount)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">License</span>
            {mod.websiteUrl ? (
              <a
                href={mod.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-brand-green hover:text-brand-dark transition-colors cursor-pointer"
              >
                View on CurseForge
              </a>
            ) : (
              <span className="text-sm font-semibold text-gray-500">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Dependencies */}
      <div className="bg-ui-panel border border-ui-border rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-white mb-4">Dependencies</h3>
        <p className="text-sm text-gray-400 mb-3">No dependencies required.</p>
        <h4 className="font-bold text-white text-sm mb-3">Recommended Mods</h4>
        <p className="text-xs text-gray-500">
          {mod.websiteUrl ? (
            <a
              href={mod.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-green hover:text-brand-dark cursor-pointer"
            >
              View recommendations on CurseForge
            </a>
          ) : (
            'N/A'
          )}
        </p>
      </div>

      {/* Report Section (only shown when fake mod detection is enabled) */}
      {userPreferencesService.getFakeModDetection() && (
        <div className="bg-ui-panel border border-ui-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-white mb-3">Report</h3>
          <p className="text-sm text-gray-400 mb-4">
            Think this mod is fake or misleading? Help the community by reporting it.
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
