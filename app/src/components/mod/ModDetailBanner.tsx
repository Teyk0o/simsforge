'use client';

import Image from 'next/image';

interface ModDetailBannerProps {
  logo: string | null;
  bannerImage: string | null;
  name: string;
}

export default function ModDetailBanner({
  logo,
  bannerImage,
  name,
}: ModDetailBannerProps) {
  return (
    <div className="relative">
      {/* Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-br from-ui-panel to-ui-dark relative overflow-hidden">
        {bannerImage ? (
          <Image
            src={bannerImage}
            alt={name}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        ) : logo ? (
          <>
            {/* Logo as background with opacity */}
            <Image
              src={logo}
              alt={name}
              fill
              className="object-cover opacity-30"
              unoptimized
              priority
            />
            {/* Gradient overlay for logo */}
            <div className="absolute inset-0 bg-gradient-to-br from-ui-panel/60 via-ui-dark/40 to-ui-dark opacity-80" />
          </>
        ) : null}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ui-dark via-transparent to-transparent opacity-90" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Logo overlapping banner */}
      <div className="px-6 lg:px-10 -mt-20 relative z-10 flex justify-center md:justify-start">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-2xl border-4 border-white dark:border-ui-panel bg-gray-800 overflow-hidden relative flex-shrink-0">
          {logo ? (
            <Image
              src={logo}
              alt={name}
              fill
              className="object-cover opacity-90"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-6xl">
              📦
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
