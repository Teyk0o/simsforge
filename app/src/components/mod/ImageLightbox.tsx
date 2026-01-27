'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: ImageLightboxProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-50"
        title={t('common.close')}
      >
        <X size={32} weight="bold" />
      </button>

      {/* Main image container */}
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex items-center justify-center">
        <Image
          src={images[currentIndex]}
          alt={t('ui.image_lightbox.image_of', { current: currentIndex + 1, total: images.length })}
          fill
          className="object-contain"
          unoptimized
          priority
        />

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
              title={t('ui.image_lightbox.previous')}
            >
              <CaretLeft size={32} weight="bold" />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
              title={t('ui.image_lightbox.next')}
            >
              <CaretRight size={32} weight="bold" />
            </button>
          </>
        )}

        {/* Image counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
          {t('ui.image_lightbox.image_of', { current: currentIndex + 1, total: images.length })}
        </div>
      </div>
    </div>
  );
}
