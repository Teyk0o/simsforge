/**
 * LocalModAvatar Component
 *
 * Displays a colored circle with the first letter of the mod name
 * Used for local mods that don't have logo images
 */

import React from 'react';

interface LocalModAvatarProps {
  modName: string;
  size?: number;
}

/**
 * Get deterministic color based on first letter
 */
const getColorForLetter = (letter: string): string => {
  const colors: Record<string, string> = {
    A: '#46C89B',
    B: '#FF6B6B',
    C: '#4ECDC4',
    D: '#FFD93D',
    E: '#A8E6CF',
    F: '#FF8B94',
    G: '#FFB3BA',
    H: '#A0C4FF',
    I: '#C9ADA7',
    J: '#9BF6FF',
    K: '#FFD6BA',
    L: '#BDB2FF',
    M: '#FFC6FF',
    N: '#CAFFBF',
    O: '#FDFFB6',
    P: '#FFD6A5',
    Q: '#FFADAD',
    R: '#FFC8DD',
    S: '#A0C4FF',
    T: '#BDB2FF',
    U: '#CAFFBF',
    V: '#FDFFB6',
    W: '#FFD6A5',
    X: '#FFADAD',
    Y: '#FFC8DD',
    Z: '#BDB2FF',
  };

  const upperLetter = letter.toUpperCase();
  return colors[upperLetter] || '#46C89B'; // Default to SimsForge green
};

export const LocalModAvatar: React.FC<LocalModAvatarProps> = ({ modName, size = 64 }) => {
  const firstLetter = modName.charAt(0).toUpperCase() || 'M';
  const backgroundColor = getColorForLetter(firstLetter);

  return (
    <div
      className="local-mod-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: size * 0.45,
        userSelect: 'none',
      }}
    >
      {firstLetter}
    </div>
  );
};
