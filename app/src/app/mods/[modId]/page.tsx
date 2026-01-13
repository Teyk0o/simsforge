'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCurseForgeMod } from '@/lib/curseforgeApi';
import { CurseForgeMod } from '@/types/curseforge';
import Layout from '@/components/layouts/Layout';
import ModDetailBanner from '@/components/mod/ModDetailBanner';
import ModDetailHeader from '@/components/mod/ModDetailHeader';
import ModDetailTabs from '@/components/mod/ModDetailTabs';
import ModDetailSidebar from '@/components/mod/ModDetailSidebar';
import { ArrowLeft } from '@phosphor-icons/react';

type TabId = 'description' | 'files' | 'images' | 'changelog';

export default function ModDetailPage() {
  const params = useParams();
  const modId = Number(params.modId as string);

  const [mod, setMod] = useState<CurseForgeMod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('description');

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
            ? 'Mod not found'
            : err.message || 'Failed to load mod details'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (modId) {
      fetchMod();
    }
  }, [modId]);

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-gray-700 border-t-green-600 rounded-full animate-spin" />
            </div>
            <p className="text-gray-400 mt-4">Loading mod details...</p>
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
              {error === 'Mod not found' ? 'Mod Not Found' : 'Error'}
            </h3>
            <p className="text-red-200 mb-4">{error || 'Failed to load mod'}</p>
            <Link href="/dashboard" className="inline-block bg-brand-green hover:bg-brand-dark px-4 py-2 rounded text-white font-medium transition-colors">
              Back to Dashboard
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
      <div className="flex-shrink-0 px-6 lg:px-10 py-4 border-b border-gray-700">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          Back
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
        <ModDetailHeader mod={mod} />

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
