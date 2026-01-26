'use client';

import { ToastProvider } from '@/context/ToastContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { UpdateProvider } from '@/context/UpdateContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import ToastContainer from '@/components/ui/ToastContainer';
import { ReactNode } from 'react';

// Initialize i18n
import '@/i18n';

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
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
    </LanguageProvider>
  );
}
