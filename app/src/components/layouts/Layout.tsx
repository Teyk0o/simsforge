'use client';

import Sidebar from '@/components/layouts/Sidebar';
import { useTheme } from '@/context/ThemeContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className="h-screen flex overflow-hidden font-sans"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      }}
      suppressHydrationWarning
    >
      <Sidebar onThemeToggle={toggleTheme} theme={theme} />
      {children}
    </div>
  );
}
