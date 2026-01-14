'use client';

import { SessionProvider } from '@/components/providers/SessionProvider';
import { ReactNode } from 'react';

/**
 * Client wrapper for root layout providers.
 * Necessary because the root layout is a Server Component,
 * but SessionProvider and its nested context providers are Client Components.
 */
export function RootLayoutClient({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
