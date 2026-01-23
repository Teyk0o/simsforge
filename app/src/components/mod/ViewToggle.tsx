/**
 * View Mode Toggle Component
 *
 * Single button toggle for switching between list and grid view modes
 */

'use client';

import { List, GridFour } from '@phosphor-icons/react';
import { ViewMode } from '@/hooks/useViewMode';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Single toggle button that switches between list and grid view
 * Shows the current mode icon and toggles on click
 */
export default function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  const handleToggle = () => {
    const newMode = viewMode === 'list' ? 'grid' : 'list';
    if (typeof onViewModeChange === 'function') {
      onViewModeChange(newMode);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 text-gray-400 hover:text-brand-green hover:bg-ui-hover rounded transition-colors cursor-pointer"
      title={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
      aria-label={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
    >
      {viewMode === 'list' ? (
        <GridFour size={20} weight="regular" />
      ) : (
        <List size={20} weight="regular" />
      )}
    </button>
  );
}
