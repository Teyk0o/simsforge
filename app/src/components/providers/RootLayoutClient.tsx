'use client';

import { SessionProvider } from '@/components/providers/SessionProvider';
import { SearchStateProvider } from '@/context/SearchStateContext';
import { useDevTools } from '@/hooks/useDevTools';
import { ReactNode } from 'react';

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
        {children}
      </SearchStateProvider>
    </SessionProvider>
  );
}
