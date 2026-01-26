/**
 * View Mode Toggle Component
 *
 * Single button toggle for switching between list and grid view modes
 */

'use client';

import { List, GridFour } from '@phosphor-icons/react';
import { ViewMode } from '@/hooks/useViewMode';
import { useTranslation } from 'react-i18next';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Single toggle button that switches between list and grid view
 * Shows the current mode icon and toggles on click
 */
export default function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  const { t } = useTranslation();

  const handleToggle = () => {
    const newMode = viewMode === 'list' ? 'grid' : 'list';
    if (typeof onViewModeChange === 'function') {
      onViewModeChange(newMode);
    }
  };

  const toggleLabel = viewMode === 'list' ? t('ui.view_toggle.switch_to_grid') : t('ui.view_toggle.switch_to_list');

  return (
    <button
      onClick={handleToggle}
      className="p-2 text-gray-400 hover:text-brand-green hover:bg-ui-hover rounded transition-colors cursor-pointer"
      title={toggleLabel}
      aria-label={toggleLabel}
    >
      {viewMode === 'list' ? (
        <GridFour size={20} weight="regular" />
      ) : (
        <List size={20} weight="regular" />
      )}
    </button>
  );
}
