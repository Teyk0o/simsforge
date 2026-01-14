'use client';

import { CurseForgeMod } from '@/types/curseforge';
import { formatDownloadCount, formatFileSize } from '@/utils/formatters';
import { Flag } from '@phosphor-icons/react';

interface ModDetailSidebarProps {
  mod: CurseForgeMod;
}

export default function ModDetailSidebar({ mod }: ModDetailSidebarProps) {
  const latestFile = mod.latestFiles?.[0];
  const version = latestFile?.displayName || 'Unknown';
  const fileSize = latestFile?.fileLength ? formatFileSize(latestFile.fileLength) : 'Unknown';

  return (
    <div className="w-full lg:w-80 flex flex-col gap-6">
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
              View recommendations on CurseForge →
            </a>
          ) : (
            'N/A'
          )}
        </p>
      </div>

      {/* Report Button */}
      <button className="text-center text-xs text-gray-400 hover:text-red-400 transition-colors py-2 flex items-center justify-center gap-1.5 cursor-pointer">
        <Flag size={16} />
        Report this mod
      </button>
    </div>
  );
}
