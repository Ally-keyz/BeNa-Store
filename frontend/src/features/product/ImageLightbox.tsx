import { useCallback, useEffect, useRef, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ProductImage as ProductImageModel } from '@/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export interface ImageLightboxProps {
  images: ProductImageModel[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  title: string;
}

/** Full-screen product image viewer with keyboard, swipe and on-screen navigation. */
export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
  title,
}: ImageLightboxProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const stableClose = useCallback(() => closeRef.current(), []);

  useFocusTrap(panelRef, true, stableClose);
  useLockBodyScroll(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stableClose();
      if (event.key === 'ArrowLeft') {
        onIndexChange(((index - 1) % images.length + images.length) % images.length);
      }
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, images.length, onIndexChange, stableClose]);

  if (typeof document === 'undefined' || images.length === 0) return null;

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    swiped.current = false;
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || images.length < 2) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;

    swiped.current = true;
    const direction = dx < 0 ? 1 : -1;
    onIndexChange((index + direction + images.length) % images.length);
  };

  const onBackdropClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    stableClose();
  };

  const image = images[index] ?? images[0]!;
  const alt = image.altText?.trim() || t('productInfo.imageAlt', { title, number: index + 1 });

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[95] flex items-center justify-center bg-night/95 p-4 backdrop-blur-sm sm:p-8"
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative flex h-full w-full max-w-6xl touch-pan-y flex-col items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={stableClose}
          aria-label={t('productInfo.closeImage')}
          className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand hover:text-on-brand"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {images.length > 1 ? (
          <button
            type="button"
            onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
            aria-label={t('a11y.previousSlide')}
            className="absolute left-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand hover:text-on-brand sm:left-2"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : null}

        <img
          src={image.url}
          alt={alt}
          className="max-h-[82vh] max-w-full object-contain"
          draggable={false}
        />

        {images.length > 1 ? (
          <button
            type="button"
            onClick={() => onIndexChange((index + 1) % images.length)}
            aria-label={t('a11y.nextSlide')}
            className="absolute right-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand hover:text-on-brand sm:right-2"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : null}

        <p className="absolute bottom-0 rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-medium tabular-nums text-white">
          {t('productInfo.imageCounter', { current: index + 1, total: images.length })}
        </p>
      </div>
    </div>,
    document.body,
  );
}
