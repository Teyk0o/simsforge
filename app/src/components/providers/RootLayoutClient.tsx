'use client';

import { SessionProvider } from '@/components/providers/SessionProvider';
import { SearchStateProvider } from '@/context/SearchStateContext';
import { useDevTools } from '@/hooks/useDevTools';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { ReactNode } from 'react';

/**
 * Inner component that uses hooks requiring providers
 */
function AppWithHooks({ children }: { children: ReactNode }) {
  // Enable automatic update checking on startup and every 6 hours
  useUpdateChecker();

  return <>{children}</>;
}

/**
 * Client wrapper for root layout providers.
 * Necessary because the root layout is a Server Component,
 * but SessionProvider and its nested context providers are Client Components.
 */
export function RootLayoutClient({ children }: { children: ReactNode }) {
  // Enable dev tools toggle with F12
  useDevTools();

  return (
    <SessionProvider>
      <SearchStateProvider>
        <AppWithHooks>{children}</AppWithHooks>
      </SearchStateProvider>
    </SessionProvider>
  );
}
