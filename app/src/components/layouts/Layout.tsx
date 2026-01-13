'use client';

import { useState } from 'react';
import Sidebar from '@/components/layouts/Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-ui-dark text-gray-800 dark:text-gray-200 font-sans" suppressHydrationWarning>
      <Sidebar onThemeToggle={toggleTheme} theme={theme} />
      {children}
    </div>
  );
}
