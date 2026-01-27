/**
 * ImportModsButton Component
 *
 * Button to trigger local mod import file picker
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { UploadSimple } from '@phosphor-icons/react';

interface ImportModsButtonProps {
  disabled?: boolean;
  onClick?: () => void;
}

export const ImportModsButton: React.FC<ImportModsButtonProps> = ({
  disabled = false,
  onClick,
}) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="import-mods-button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--ui-background)',
        color: 'var(--text-primary)',
        border: '1px solid var(--ui-border)',
        borderRadius: '0.5rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s',
      }}
      title={t('library.import_mods_tooltip')}
    >
      <UploadSimple size={20} weight="bold" />
      <span>{t('library.import_mods')}</span>
    </button>
  );
};
