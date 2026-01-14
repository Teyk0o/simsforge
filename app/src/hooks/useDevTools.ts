import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Hook to enable dev tools toggle with F12 key
 * Allows opening the developer console in production builds
 */
export function useDevTools() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F12 or Ctrl+Shift+I to toggle dev tools
      if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && event.key === 'I')) {
        event.preventDefault();
        invoke('toggle_devtools').catch((err) => {
          console.error('Failed to toggle dev tools:', err);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
