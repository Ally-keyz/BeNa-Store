import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';
import { cn } from '@/lib/cn';
import { getPrimaryImage } from '@/lib/product';
import { Maximize2 } from 'lucide-react';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { ProductImage } from '@/components/ui/ProductImage';
import { ImageLightbox } from './ImageLightbox';

export interface ProductGalleryProps {
  product: Product;
}

/**
 * Compact gallery: thumbnails sit to the left of the main image, which fills
 * the available image area. Swipe the main image to browse without opening
 * the viewer; tapping it opens a full-screen viewer with swipe navigation.
 */
export function ProductGallery({ product }: ProductGalleryProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const primary = getPrimaryImage(product);
  const images = product.images.length ? product.images : primary ? [primary] : [];
  const lightboxImages = images.filter((image) => !image.url.includes('fixtures.invalid'));

  useEffect(() => {
    setActive(0);
    setLightboxIndex(null);
  }, [product.handle]);

  const activeImage = images[active] ?? primary ?? null;
  const labelFor = (index: number) =>
    t('productInfo.imageAlt', { title: product.title, number: index + 1 });

  const onTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    swiped.current = false;
  };

  const onTouchEnd = (event: TouchEvent<HTMLButtonElement>) => {
    const start = swipeStart.current;
    const touch = event.changedTouches[0];
    swipeStart.current = null;
    if (!start || !touch || images.length < 2) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;

    swiped.current = true;
    const direction = dx < 0 ? 1 : -1;
    setActive((current) => (current + direction + images.length) % images.length);
  };

  const openLightbox = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (!lightboxImages.length) return;
    const url = activeImage?.url;
    const start = url ? lightboxImages.findIndex((image) => image.url === url) : 0;
    setLightboxIndex(start >= 0 ? start : 0);
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[68px_minmax(0,1fr)]">
        {images.length > 1 ? (
          <div
            className="order-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:order-1 sm:max-h-[min(64vh,580px)] sm:flex-col sm:snap-none sm:overflow-x-hidden sm:overflow-y-auto sm:pb-0"
            role="group"
            aria-label={product.title}
          >
            {images.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                aria-label={labelFor(index)}
                aria-pressed={active === index}
                className={cn(
                  'h-16 w-16 shrink-0 snap-start overflow-hidden rounded-xl bg-terra-50 transition-all',
                  active === index
                    ? 'ring-2 ring-brand ring-offset-2'
                    : 'opacity-70 hover:opacity-100',
                )}
              >
                <ProductImage image={image} alt="" sizes="64px" className="h-full w-full object-contain p-1" />
              </button>
            ))}
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}

        <button
          type="button"
          onClick={openLightbox}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-label={t('productInfo.openImage', { number: active + 1 })}
          className="group relative order-1 flex h-[min(44dvh,420px)] w-full touch-pan-y items-center justify-center overflow-hidden rounded-2xl border-2 border-neutral-600 bg-white p-3 sm:order-2 sm:h-[min(64vh,580px)] sm:p-4"
        >
          {activeImage ? (
            <ProductImage
              image={activeImage}
              alt={activeImage.altText || labelFor(active)}
              sizes="(min-width: 1024px) 55vw, 100vw"
              priority
              className="h-full w-full object-contain"
            />
          ) : (
            <PlaceholderImage label={t('hero.placeholderLabel')} />
          )}
          <span className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-night shadow-sm transition-transform group-hover:scale-105">
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      </div>

      {lightboxIndex !== null ? (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          title={product.title}
        />
      ) : null}
    </div>
  );
}
