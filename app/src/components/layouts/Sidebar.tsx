'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MagnifyingGlass, DownloadSimple, ArrowsClockwise, Heart, Moon, Sun, Plus, GameController, SignOut, GearSix } from '@phosphor-icons/react';

interface SidebarProps {
  onThemeToggle: () => void;
  theme: 'dark' | 'light';
}

export default function Sidebar({ onThemeToggle, theme }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();

  // Map current pathname to active nav item
  const getActiveNav = () => {
    if (pathname === '/') return 'browse';
    if (pathname === '/library' || pathname?.startsWith('/mods/')) return 'library';
    if (pathname === '/updates') return 'updates';
    if (pathname === '/favorites') return 'favorites';
    return null;
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <aside className="w-20 lg:w-64 bg-white dark:bg-ui-panel border-r border-gray-200 dark:border-ui-border flex flex-col flex-shrink-0 z-20">
      {/* Header */}
      <div className="h-16 flex items-center px-4 lg:px-6 border-b border-gray-200 dark:border-ui-border">
        <div className="w-8 h-8 text-brand-green flex-shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 2L3 11L12 22L21 11L12 2Z" />
          </svg>
        </div>
        <span className="ml-3 font-display font-bold text-xl hidden lg:block tracking-tight text-gray-900 dark:text-white">
          Sims<span className="text-brand-green">Forge</span>
        </span>
      </div>

      {/* Profiles Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
          Profil Actif
        </div>

        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-gray-50 dark:bg-ui-hover/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-ui-hover transition-colors mb-4">
          <Plus size={20} weight="bold" />
          <span className="hidden lg:block text-sm">Créer un profil</span>
        </button>

        <div className="border-t border-gray-200 dark:border-ui-border my-2" />

        {/* Navigation */}
        <nav className="space-y-1">
          {[
            { id: 'browse', label: 'Parcourir', icon: MagnifyingGlass, href: '/' },
            { id: 'library', label: 'Bibliothèque', icon: DownloadSimple, href: '/library' },
            { id: 'updates', label: 'Mises à jour', icon: ArrowsClockwise, href: '/updates' },
            { id: 'favorites', label: 'Favoris', icon: Heart, href: '/favorites' },
          ].map(({ id, label, icon: Icon, badge, href }) => (
            <button
              key={id}
              onClick={() => router.push(href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                getActiveNav() === id
                  ? 'bg-gray-100 dark:bg-ui-hover text-brand-green font-medium shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-ui-hover'
              }`}
            >
              <Icon size={20} />
              <span className="hidden lg:block">{label}</span>
              {badge && (
                <span className="hidden lg:flex w-5 h-5 bg-brand-orange text-white text-[10px] font-bold rounded items-center justify-center ml-auto">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-ui-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="hidden lg:block overflow-hidden flex-1">
          <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'User'}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="text-gray-400 hover:text-brand-green transition-colors"
            aria-label="Settings"
            title="Settings"
          >
            <GearSix size={20} />
          </Link>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400 transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <SignOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
