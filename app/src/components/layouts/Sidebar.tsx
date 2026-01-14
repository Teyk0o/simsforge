'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <aside
      className="w-20 lg:w-64 border-r flex flex-col flex-shrink-0 z-20"
      style={{
        backgroundColor: 'var(--ui-panel)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        className="h-16 flex items-center justify-center px-4 lg:px-6 border-b"
        style={{
          borderColor: 'var(--border-color)',
        }}
      >
        <Link href="/" className="flex items-center h-full">
          <Image
            src="/logo.png"
            alt="SimsForge"
            width={170}
            height={36}
            className="hidden lg:block"
            style={{ maxWidth: '160px', height: 'auto' }}
            priority
          />
          <div className="w-8 h-8 text-brand-green flex-shrink-0 flex items-center justify-center lg:hidden">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 2L3 11L12 22L21 11L12 2Z" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Profiles Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div
          className="hidden lg:block text-xs font-bold uppercase tracking-wider px-2 mb-2"
          style={{
            color: 'var(--text-secondary)',
          }}
        >
          Profil Actif
        </div>

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all mb-4 cursor-pointer"
          style={{
            backgroundColor: 'var(--ui-hover)',
            color: 'var(--text-secondary)',
            opacity: 0.5,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.5';
          }}
        >
          <Plus size={20} weight="bold" />
          <span className="hidden lg:block text-sm">Créer un profil</span>
        </button>

        <div
          className="border-t my-2"
          style={{
            borderColor: 'var(--border-color)',
          }}
        />

        {/* Navigation */}
        <nav className="space-y-1">
          {[
            { id: 'browse', label: 'Parcourir', icon: MagnifyingGlass, href: '/' },
            { id: 'library', label: 'Bibliothèque', icon: DownloadSimple, href: '/library' },
            { id: 'updates', label: 'Mises à jour', icon: ArrowsClockwise, href: '/updates' },
            { id: 'favorites', label: 'Favoris', icon: Heart, href: '/favorites' },
          ].map(({ id, label, icon: Icon, badge, href }) => {
            const isActive = getActiveNav() === id;
            return (
              <button
                key={id}
                onClick={() => router.push(href)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer"
                style={{
                  backgroundColor: isActive ? 'var(--ui-hover)' : 'transparent',
                  color: isActive ? '#46C89B' : 'var(--text-secondary)',
                  fontWeight: isActive ? '500' : 'normal',
                  boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={20} />
                <span className="hidden lg:block">{label}</span>
                {badge && (
                  <span className="hidden lg:flex w-5 h-5 bg-brand-orange text-white text-[10px] font-bold rounded items-center justify-center ml-auto">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div
        className="p-4 border-t flex items-center gap-3"
        style={{
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="hidden lg:block overflow-hidden flex-1">
          <div
            className="text-sm font-bold truncate"
            style={{
              color: 'var(--text-primary)',
            }}
          >
            {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'User'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="transition-colors cursor-pointer"
            style={{
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#46C89B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Settings"
            title="Settings"
          >
            <GearSix size={20} />
          </Link>
          <button
            onClick={handleLogout}
            className="transition-colors cursor-pointer"
            style={{
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
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
