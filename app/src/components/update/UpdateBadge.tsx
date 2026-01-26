'use client';

import { useUpdates } from '@/context/UpdateContext';
import { useTranslation } from 'react-i18next';

interface UpdateBadgeProps {
  modId: number;
}

/**
 * Small badge indicating an update is available for a mod
 *
 * Displays a small green "Update" pill on mod cards
 * when a newer version is available on CurseForge.
 */
export default function UpdateBadge({ modId }: UpdateBadgeProps) {
  const { t } = useTranslation();
  const { hasUpdate } = useUpdates();

  if (!hasUpdate(modId)) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: 'rgba(70, 200, 155, 0.15)',
        color: '#46C89B',
        border: '1px solid rgba(70, 200, 155, 0.3)',
      }}
    >
      {t('common.update')}
    </span>
  );
}
