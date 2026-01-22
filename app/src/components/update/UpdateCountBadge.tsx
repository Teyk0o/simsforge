'use client';

interface UpdateCountBadgeProps {
  count: number;
}

/**
 * Badge showing the number of available updates
 *
 * Displays a red count bubble in the sidebar nav item
 * when updates are available. Hidden when count is 0.
 */
export default function UpdateCountBadge({ count }: UpdateCountBadgeProps) {
  if (count === 0) {
    return null;
  }

  // Format count (show 9+ for more than 9)
  const displayCount = count > 9 ? '9+' : count.toString();

  return (
    <span
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold"
      style={{
        backgroundColor: '#ef4444',
        color: 'white',
        fontSize: '10px',
        lineHeight: '1',
      }}
    >
      {displayCount}
    </span>
  );
}
