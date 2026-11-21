import { useEffect, useMemo, useRef, useState, type FocusEvent, type TouchEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/Button';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useMarket } from '@/context/MarketContext';
import { useProducts } from '@/hooks/useCatalog';
import { formatMoney } from '@/lib/money';
import { getAvailability, getDefaultVariant, getPrimaryImage } from '@/lib/product';
import { stripHtml } from '@/lib/sanitize';
import type { Product } from '@/types';
import { HERO_FALLBACK_IMAGES, HERO_SLIDES, type HeroCarouselSlide } from './slides';

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD = 40;
function isExcludedFromHero(product: Product): boolean {
  const text = `${product.handle} ${product.title}`;
  return /sosoma/i.test(text) || getAvailability(product) !== 'available';
}

const controlButton =
  'inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-white/35 text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

const controlMotion = {
  whileHover: { scale: 1.08 },
  whileTap: { scale: 0.92 },
} as const;

function productSlides(products: Product[], t: (key: string, options?: Record<string, unknown>) => string, locale: string): HeroCarouselSlide[] {
  return products
    .filter((product) => !isExcludedFromHero(product))
    .filter((product) => {
      const url = getPrimaryImage(product)?.url;
      return Boolean(url) && !url?.includes('fixtures.invalid');
    })
    .slice(0, 5)
    .map((product) => {
      const image = getPrimaryImage(product)!;
      const price = getDefaultVariant(product)?.price ?? product.priceRange.minVariantPrice;
      const description = stripHtml(product.description).replace(/\s+/g, ' ').trim();
      const subtitle = description.length > 120 ? `${description.slice(0, 117)}…` : description;
      const category = product.productType?.trim() || product.vendor?.trim();

      return {
        key: product.id,
        href: `/products/${product.handle}`,
        image: image.url,
        eyebrow: [t('hero.productEyebrow'), category].filter(Boolean).join(' · '),
        title: product.title,
        subtitle: subtitle || t('home.featuredBody'),
        cta: t('hero.productCta'),
        imageAlt: image.altText?.trim() || t('hero.productImageAlt', { title: product.title }),
        meta: formatMoney(price, { locale }) || undefined,
      };
    });
}

export interface HeroCarouselProps {
  /**
   * Supply products to show a different set in the carousel (e.g. the
   * Rwandan-products page). When omitted, the five newest products are used.
   */
  products?: Product[];
  className?: string;
}

/**
 * Product-led hero carousel. It uses real, recently uploaded product imagery
 * and links each slide to that product with its live price and description.
 * Editorial slides are used only until product photography is available.
 */
export function HeroCarousel({ products, className }: HeroCarouselProps) {
  const { t } = useTranslation();
  const { marketParams, formatLocale } = useMarket();
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [pointerPaused, setPointerPaused] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const latestQuery = useProducts(
    { first: 5, sortKey: 'CREATED_AT', ...marketParams },
    products === undefined,
  );

  const slides = useMemo<HeroCarouselSlide[]>(() => {
    const source = products ?? latestQuery.data?.items ?? [];
    const live = productSlides(source, t, formatLocale);
    if (live.length) return live;

    return HERO_SLIDES.map((slide) => {
      const text = (field: 'eyebrow' | 'title' | 'subtitle' | 'cta' | 'imageAlt') =>
        t(`hero.slides.${slide.id}.${field}`);
      return {
        key: slide.id,
        href: slide.href,
        image: slide.image ?? HERO_FALLBACK_IMAGES[slide.id],
        eyebrow: text('eyebrow'),
        title: text('title'),
        subtitle: text('subtitle'),
        cta: text('cta'),
        imageAlt: text('imageAlt'),
      };
    });
  }, [products, latestQuery.data, t, formatLocale]);

  const total = slides.length;
  const slide = slides[index] ?? slides[0]!;
  const autoplay = !userPaused && !pointerPaused && !focusWithin && !reducedMotion;
  const slideKeys = slides.map((item) => item.key).join('|');

  useEffect(() => {
    setIndex(0);
  }, [slideKeys]);

  useEffect(() => {
    if (!autoplay || total < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay, total]);

  const goTo = (next: number) => setIndex(((next % total) + total) % total);

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    const end = event.changedTouches[0]?.clientX;
    if (start === null || end === undefined) return;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta > 0) goTo(index - 1);
    else goTo(index + 1);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('a11y.carouselLabel')}
      className={cn(
        'relative isolate h-[clamp(350px,60dvh,460px)] w-full overflow-hidden rounded-none bg-night text-white sm:h-[clamp(370px,39vw,450px)] sm:rounded-4xl',
        className,
      )}
      onMouseEnter={() => setPointerPaused(true)}
      onMouseLeave={() => setPointerPaused(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={onBlur}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.key}
          className="absolute inset-0 -z-20"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src={slide.image}
            alt={slide.imageAlt}
            className="h-full w-full object-cover"
            draggable={false}
            decoding="async"
          />
        </motion.div>
      </AnimatePresence>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 dark-overlay sm:dark-overlay-right"
      />

      <div className="flex h-full flex-col justify-end px-5 pb-5 sm:px-8 sm:pb-8 lg:px-0 lg:pb-10">
        <div className="mx-auto w-full max-w-5xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`copy-${slide.key}`}
              className="min-w-0 max-w-xl"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="flex items-center gap-2 break-words text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {slide.meta ? <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" /> : null}
                {slide.eyebrow}
              </p>
              <h1 className="mt-2 line-clamp-3 max-w-none break-words font-display text-[clamp(24px,7vw,30px)] font-semibold leading-[1.04] tracking-tight [overflow-wrap:anywhere] sm:mt-3 sm:max-w-[17ch] sm:text-[clamp(28px,3.6vw,44px)]">
                {slide.title}
              </h1>
              <p className="mt-2 line-clamp-2 max-w-md break-words text-sm leading-6 text-white/80 sm:mt-3 sm:text-[15px]">
                {slide.subtitle}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-5">
                <Link
                  to={slide.href}
                  className={cn(
                    buttonVariants({ size: 'md' }),
                    'rounded-full bg-brand px-6 text-on-brand hover:bg-white hover:text-night',
                  )}
                >
                  {slide.cta}
                </Link>
                {slide.meta ? (
                  <span className="max-w-full break-words rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold tabular-nums backdrop-blur-sm">
                    {slide.meta}
                  </span>
                ) : null}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-white/20 pt-3 sm:mt-5 sm:flex-nowrap sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="shrink-0 text-sm tabular-nums text-white/80" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
                <span className="text-white/45"> / {String(total).padStart(2, '0')}</span>
              </span>
              <div className="hidden items-center sm:flex">
                {slides.map((item, itemIndex) => (
                  <motion.button
                    key={item.key}
                    type="button"
                    onClick={() => goTo(itemIndex)}
                    aria-label={t('a11y.goToSlide', { number: itemIndex + 1 })}
                    aria-current={itemIndex === index ? 'true' : undefined}
                    {...controlMotion}
                    className="group flex h-11 w-11 shrink-0 items-center justify-center px-1 focus-visible:outline-none sm:h-8 sm:w-8"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'block h-0.5 rounded-full transition-all duration-500 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-night',
                        itemIndex === index
                          ? 'w-10 bg-brand'
                          : 'w-5 bg-white/40 group-hover:bg-white/70',
                      )}
                    />
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!reducedMotion && total > 1 ? (
                <motion.button
                  type="button"
                  onClick={() => setUserPaused((value) => !value)}
                  aria-label={userPaused ? t('a11y.playCarousel') : t('a11y.pauseCarousel')}
                  {...controlMotion}
                  className={controlButton}
                >
                  {userPaused ? (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  )}
                </motion.button>
              ) : null}
              <motion.button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label={t('a11y.previousSlide')}
                {...controlMotion}
                className={controlButton}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </motion.button>
              <motion.button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label={t('a11y.nextSlide')}
                {...controlMotion}
                className={controlButton}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {index + 1} / {total} — {slide.title}
      </p>
    </section>
  );
}
