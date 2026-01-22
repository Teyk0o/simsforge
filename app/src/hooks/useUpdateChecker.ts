/**
 * Update Checker Hook
 *
 * Manages automatic update checking on app startup
 * and at regular intervals (every 6 hours).
 */

import { useEffect, useRef } from 'react';
import { useUpdates } from '@/context/UpdateContext';
import { useProfiles } from '@/context/ProfileContext';

/**
 * Interval for automatic update checks (6 hours in milliseconds)
 */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Delay before initial check on app startup (5 seconds)
 * Allows the app to fully initialize first
 */
const INITIAL_CHECK_DELAY_MS = 5000;

/**
 * Hook for automatic update checking
 *
 * - Runs an initial check 5 seconds after mount
 * - Sets up a 6-hour interval for subsequent checks
 * - Only runs when there's an active profile with mods
 * - Cleans up on unmount
 *
 * @example
 * ```tsx
 * function App() {
 *   useUpdateChecker();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useUpdateChecker(): void {
  const { checkForUpdates, isChecking, lastCheckTime } = useUpdates();
  const { activeProfile, isInitialized } = useProfiles();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialCheckRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialCheckRun = useRef(false);

  useEffect(() => {
    // Wait for profile initialization
    if (!isInitialized) {
      return;
    }

    // Don't run if no active profile or no mods
    if (!activeProfile || activeProfile.mods.length === 0) {
      return;
    }

    // Don't run if already checking
    if (isChecking) {
      return;
    }

    /**
     * Run the update check
     */
    const runCheck = async () => {
      try {
        console.log('[useUpdateChecker] Running update check...');
        await checkForUpdates();
        console.log('[useUpdateChecker] Update check complete');
      } catch (error) {
        console.error('[useUpdateChecker] Update check failed:', error);
      }
    };

    /**
     * Check if we should run an initial check
     * Skip if we've checked recently (within the last 30 minutes)
     */
    const shouldRunInitialCheck = (): boolean => {
      if (hasInitialCheckRun.current) {
        return false;
      }

      if (!lastCheckTime) {
        return true;
      }

      const timeSinceLastCheck = Date.now() - lastCheckTime.getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      return timeSinceLastCheck > thirtyMinutes;
    };

    // Schedule initial check with delay
    if (shouldRunInitialCheck()) {
      initialCheckRef.current = setTimeout(() => {
        hasInitialCheckRun.current = true;
        runCheck();
      }, INITIAL_CHECK_DELAY_MS);
    }

    // Set up recurring interval
    intervalRef.current = setInterval(runCheck, CHECK_INTERVAL_MS);

    // Cleanup on unmount or dependency change
    return () => {
      if (initialCheckRef.current) {
        clearTimeout(initialCheckRef.current);
        initialCheckRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isInitialized, activeProfile, isChecking, lastCheckTime, checkForUpdates]);
}

export default useUpdateChecker;
