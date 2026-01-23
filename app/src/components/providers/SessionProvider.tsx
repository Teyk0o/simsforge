'use client';

import { ToastProvider } from '@/context/ToastContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { UpdateProvider } from '@/context/UpdateContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ToastContainer from '@/components/ui/ToastContainer';
import { ReactNode } from 'react';

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ProfileProvider>
          <UpdateProvider>
            {children}
            <ToastContainer />
          </UpdateProvider>
        </ProfileProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
