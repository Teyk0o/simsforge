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
      <div
        className="h-48 md:h-64 relative overflow-hidden"
        style={{
          background: `linear-gradient(to bottom right, var(--ui-panel), var(--ui-dark))`,
        }}
      >
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
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background: `linear-gradient(to bottom right, color-mix(in srgb, var(--ui-panel) 60%, transparent), color-mix(in srgb, var(--ui-dark) 40%, transparent), var(--ui-dark))`,
              }}
            />
          </>
        ) : null}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `linear-gradient(to top, var(--ui-dark), transparent, transparent)`,
          }}
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Logo overlapping banner */}
      <div className="px-6 lg:px-10 -mt-20 relative z-10 flex justify-center md:justify-start">
        <div
          className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden relative flex-shrink-0"
          style={{
            backgroundColor: 'var(--ui-bg-dark)',
            borderColor: 'var(--ui-panel)',
          }}
        >
          {logo ? (
            <Image
              src={logo}
              alt={name}
              fill
              className="object-cover opacity-90"
              unoptimized
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-6xl"
              style={{ color: 'var(--text-tertiary)' }}
            >
              📦
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
