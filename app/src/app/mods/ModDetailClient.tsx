'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurseForgeMod } from '@/lib/curseforgeApi';
import { getModWarningStatus } from '@/lib/fakeDetectionApi';
import { userPreferencesService } from '@/lib/services/UserPreferencesService';
import { CurseForgeMod } from '@/types/curseforge';
import type { ModWarningStatus } from '@/types/fakeDetection';
import Layout from '@/components/layouts/Layout';
import ModDetailBanner from '@/components/mod/ModDetailBanner';
import ModDetailHeader from '@/components/mod/ModDetailHeader';
import ModDetailTabs from '@/components/mod/ModDetailTabs';
import ModDetailSidebar from '@/components/mod/ModDetailSidebar';
import { ArrowLeft } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

type TabId = 'description' | 'files' | 'images' | 'changelog';

export default function ModDetailClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const modId = Number(searchParams.get('id'));

  const [mod, setMod] = useState<CurseForgeMod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('description');
  const [warningStatus, setWarningStatus] = useState<ModWarningStatus | null>(null);

  useEffect(() => {
    const fetchMod = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const modData = await getCurseForgeMod(modId);
        setMod(modData);
      } catch (err: any) {
        console.error('[ModDetail] Error fetching mod:', err);
        setError(
          err.response?.status === 404
            ? t('mods.detail.not_found')
            : err.message || t('mods.detail.error_loading')
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (modId) {
      fetchMod();
    }
  }, [modId]);

  /**
   * Fetch warning status for the mod (only if fake mod detection is enabled)
   */
  useEffect(() => {
    if (!mod) return;
    if (!userPreferencesService.getFakeModDetection()) return;

    const fetchWarningStatus = async () => {
      try {
        // Get creator ID from first author
        const creatorId = mod.authors && mod.authors.length > 0 ? mod.authors[0].id : undefined;
        const status = await getModWarningStatus(mod.id, creatorId);
        setWarningStatus(status);
      } catch (err) {
        console.error('[ModDetail] Error fetching warning status:', err);
        // Don't fail the page if warning status fails to load
      }
    };

    fetchWarningStatus();
  }, [mod]);

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--ui-border)', borderTopColor: 'var(--brand-green)' }} />
            </div>
            <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>{t('mods.detail.loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error || !mod) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md bg-red-900/20 rounded-lg p-8 border border-red-700">
            <h3 className="text-lg font-semibold mb-2 text-red-300">
              {error === t('mods.detail.not_found') ? t('mods.detail.not_found') : t('mods.detail.error_title')}
            </h3>
            <p className="text-red-200 mb-4">{error || t('mods.detail.error_generic')}</p>
            <Link href="/" className="inline-block bg-brand-green hover:bg-brand-dark px-4 py-2 rounded text-white font-medium transition-colors">
              {t('mods.detail.back_to_dashboard')}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const bannerImage = mod.screenshots?.[0] || null;

  return (
    <Layout>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Back button */}
      <div className="h-16 flex-shrink-0 px-6 lg:px-10 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 transition-colors text-sm font-medium cursor-pointer px-2 py-1 rounded"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#46C89B';
            e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <ArrowLeft size={18} />
          {t('mods.detail.back')}
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Banner */}
        <ModDetailBanner
          logo={mod.logo}
          bannerImage={bannerImage}
          name={mod.name}
        />

        {/* Header */}
        <ModDetailHeader mod={mod} warningStatus={warningStatus} />

        {/* Main content: Tabs + Sidebar */}
        <div className="px-6 lg:px-10 pb-10 max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row gap-8 mt-8">
            {/* Tabs content */}
            <ModDetailTabs
              mod={mod}
              activeTab={activeTab}
              onTabChange={setActiveTab as (tab: string) => void}
            />

            {/* Sidebar */}
            <ModDetailSidebar mod={mod} />
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
}
