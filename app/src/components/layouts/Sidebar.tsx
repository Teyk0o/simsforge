'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useProfiles } from '@/context/ProfileContext';
import { useUpdates } from '@/context/UpdateContext';
import { MagnifyingGlass, DownloadSimple, Heart, GearSix } from '@phosphor-icons/react';
import ProfileSelector from '@/components/profile/ProfileSelector';
import UpdateCountBadge from '@/components/update/UpdateCountBadge';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  onThemeToggle: () => void;
  theme: 'dark' | 'light';
}

export default function Sidebar({ onThemeToggle, theme }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeProfile, profiles, activateProfile, isInitialized } = useProfiles();
  const { updateCount } = useUpdates();
  const { t } = useTranslation();

  // Map current pathname to active nav item
  const getActiveNav = () => {
    if (pathname === '/' || pathname?.startsWith('/mods')) return 'browse';
    if (pathname === '/library') return 'library';
    return null;
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
            alt={t('layout.sidebar.logo_alt')}
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div
          className="hidden lg:block text-xs font-semibold uppercase tracking-wider"
          style={{
            color: 'var(--text-secondary)',
            fontSize: '11px',
            letterSpacing: '0.05em',
          }}
        >
          {t('layout.sidebar.active_profile')}
        </div>

        <ProfileSelector
          activeProfile={activeProfile}
          profiles={profiles}
          onActivate={activateProfile}
          isInitialized={isInitialized}
        />

        <div
          className="border-t my-2"
          style={{
            borderColor: 'var(--border-color)',
          }}
        />

        {/* Navigation */}
        <nav className="space-y-1">
          {[
            { id: 'browse', label: t('layout.sidebar.browse'), icon: MagnifyingGlass, href: '/' },
            { id: 'library', label: t('layout.sidebar.library'), icon: DownloadSimple, href: '/library', badge: updateCount },
          ].map(({ id, label, icon: Icon, href, badge }) => {
            const isActive = getActiveNav() === id && !href.includes('filter=updates');
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
                <span className="hidden lg:block flex-1 text-left">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <UpdateCountBadge count={badge} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Footer */}
      <div
        className="p-4 border-t flex items-center justify-center lg:justify-start gap-3"
        style={{
          borderColor: 'var(--border-color)',
        }}
      >
        <Link
          href="/settings"
          className="flex items-center gap-3 transition-colors cursor-pointer"
          style={{
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#46C89B';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          aria-label={t('layout.sidebar.settings')}
          title={t('layout.sidebar.settings')}
        >
          <GearSix size={20} />
          <span className="hidden lg:block text-sm font-medium">{t('layout.sidebar.settings')}</span>
        </Link>
      </div>
    </aside>
  );
}
