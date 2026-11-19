import { useEffect, useRef, useState, type FocusEvent, type TouchEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/Button';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { HERO_SLIDES } from './slides';

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD = 40;

/**
 * Home hero carousel.
 *
 * Accessible by design: pause control, hover/focus pause, reduced-motion
 * aware, arrow keys on the control buttons, swipe support and a polite live
 * region announcing each slide. Height is fixed so CLS stays at zero:
 * 420px mobile, clamp(380px, 42vw, 460px) from `sm` up.
 */
export function HeroCarousel() {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [pointerPaused, setPointerPaused] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = HERO_SLIDES.length;
  const slide = HERO_SLIDES[index] ?? HERO_SLIDES[0]!;
  const autoplay = !userPaused && !pointerPaused && !focusWithin && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay, total]);

  const goTo = (next: number) => setIndex(((next % total) + total) % total);
  const key = (id: string, field: 'eyebrow' | 'title' | 'subtitle' | 'cta' | 'imageAlt') =>
    t(`hero.slides.${id}.${field}`);

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocusWithin(false);
    }
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
      className="relative h-[420px] overflow-hidden rounded-hero bg-chocolate-950 text-white sm:h-[clamp(380px,42vw,460px)]"
      onMouseEnter={() => setPointerPaused(true)}
      onMouseLeave={() => setPointerPaused(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={onBlur}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div key={slide.id} className="animate-fade-in grid h-full grid-rows-[150px_1fr] sm:grid-cols-2 sm:grid-rows-1">
        <div className="relative order-1 min-h-0 overflow-hidden sm:order-2">
          <PlaceholderImage label={t('hero.placeholderLabel')} className="h-full" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-chocolate-950 via-chocolate-950/20 to-transparent sm:bg-gradient-to-l sm:from-transparent sm:via-chocolate-950/10 sm:to-chocolate-950"
          />
        </div>

        <div className="order-2 flex min-h-0 flex-col justify-center px-5 pb-5 pt-1 sm:order-1 sm:px-10 sm:py-12 lg:px-14">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-chocolate-300">
            {key(slide.id, 'eyebrow')}
          </p>
          <h1 className="mt-2 line-clamp-3 max-w-[15ch] font-display text-[clamp(28px,3.2vw,44px)] font-semibold leading-[1.08] tracking-tight sm:mt-3">
            {key(slide.id, 'title')}
          </h1>
          <p className="mt-2 line-clamp-2 max-w-md text-sm leading-6 text-white/70 sm:mt-4 sm:text-[15px]">
            {key(slide.id, 'subtitle')}
          </p>
          <div className="mt-3 sm:mt-7">
            <Link
              to={slide.href}
              className={cn(
                buttonVariants({ size: 'md' }),
                'bg-white text-chocolate-950 hover:bg-chocolate-50',
              )}
            >
              {key(slide.id, 'cta')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {index + 1} / {total} — {key(slide.id, 'title')}
      </p>

      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-0.5 rounded-full bg-chocolate-950/75 p-1 text-white backdrop-blur sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label={t('a11y.previousSlide')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-center">
          {HERO_SLIDES.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(itemIndex)}
              aria-label={t('a11y.goToSlide', { number: itemIndex + 1 })}
              aria-current={itemIndex === index ? 'true' : undefined}
              className="inline-flex h-8 w-6 items-center justify-center rounded-full hover:bg-white/15"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  itemIndex === index ? 'w-4 bg-white' : 'w-1.5 bg-white/40',
                )}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label={t('a11y.nextSlide')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>

        {!reducedMotion ? (
          <button
            type="button"
            onClick={() => setUserPaused((value) => !value)}
            aria-label={userPaused ? t('a11y.playCarousel') : t('a11y.pauseCarousel')}
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15"
          >
            {userPaused ? (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
    </section>
  );
}
