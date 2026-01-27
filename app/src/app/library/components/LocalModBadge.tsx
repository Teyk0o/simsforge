/**
 * LocalModBadge Component
 *
 * Displays a "Local" badge next to local mod names
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

export const LocalModBadge: React.FC = () => {
  const { t } = useTranslation();

  return (
    <span
      className="local-mod-badge"
      style={{
        fontSize: '0.75rem',
        padding: '0.125rem 0.5rem',
        borderRadius: '0.25rem',
        backgroundColor: 'var(--ui-hover)',
        color: 'var(--text-primary)',
        fontWeight: 500,
        marginLeft: '0.5rem',
      }}
    >
      {t('library.local_badge')}
    </span>
  );
};
