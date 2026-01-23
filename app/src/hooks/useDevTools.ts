import { useEffect } from 'react';

/**
 * Hook to detect F12 key press for dev tools
 * In Tauri, dev tools can be enabled at build time or via window settings
 */
export function useDevTools() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F12 or Ctrl+Shift+I - notify user of available shortcuts
      if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && event.key === 'I')) {
        event.preventDefault();
        // Dev tools can be built with Tauri feature flags
        // For now, just log to console that the key was pressed
        console.log('Dev tools shortcut detected. Build with dev tools enabled to use.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
