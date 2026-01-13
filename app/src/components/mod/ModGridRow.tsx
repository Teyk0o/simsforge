/**
 * Grid Row Component for Virtualized Grid
 *
 * Displays a row of mod cards for use with react-window virtualization
 */

'use client';

import ModCard from '@/components/mod/ModCard';
import { CurseForgeMod } from '@/types/curseforge';

interface ModGridRowProps {
  /** Slice of mods to display in this row */
  mods: CurseForgeMod[];
  /** Index of the row (for keys) */
  index: number;
  /** Number of columns for this row */
  columns: number;
}

/**
 * Row component containing multiple mod cards
 * Used with react-window List for virtualized grid rendering
 *
 * Responsive column layout:
 * - Mobile (xs): 1 column (4 cards per row if width allows)
 * - Tablet (md): 2 columns
 * - Desktop (lg): 3 columns
 * - Large (xl): 4 columns
 */
export default function ModGridRow({ mods, index, columns }: ModGridRowProps) {
  // Determine grid class based on columns
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  }[columns] || 'grid-cols-4';

  return (
    <div className={`grid ${gridColsClass} gap-4 px-4 lg:px-8 py-4 pb-4`}>
      {mods.map((mod) => (
        <ModCard key={mod.id} mod={mod} />
      ))}
    </div>
  );
}
