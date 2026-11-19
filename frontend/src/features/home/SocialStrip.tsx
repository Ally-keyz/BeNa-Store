import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Facebook, Instagram, Music2 } from 'lucide-react';
import { BRAND } from '@/config';
import { pageContainer, sectionSpacing } from '@/lib/layout';

const SOCIALS = [
  { href: BRAND.social.instagram, labelKey: 'home.socialInstagram', Icon: Instagram },
  { href: BRAND.social.facebook, labelKey: 'home.socialFacebook', Icon: Facebook },
  { href: BRAND.social.tiktok, labelKey: 'home.socialTiktok', Icon: Music2 },
] as const;

export function SocialStrip() {
  const { t } = useTranslation();

  return (
    <section className={sectionSpacing}>
      <div className={pageContainer}>
        <div className="relative overflow-hidden rounded-hero bg-chocolate-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border border-white/10"
          />

          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-lg">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-chocolate-300">
                {BRAND.name}
              </p>
              <h2 className="mt-2 font-display text-[clamp(24px,2.4vw,32px)] font-semibold tracking-tight">
                {t('home.socialHeading')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/70">{t('home.socialBody')}</p>
            </div>

            <ul className="flex flex-wrap gap-2">
              {SOCIALS.map(({ href, labelKey, Icon }) => (
                <li key={labelKey}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 px-4 text-sm text-white/90 transition-colors hover:border-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t(labelKey)}
                    <ArrowUpRight className="h-3.5 w-3.5 text-white/60" aria-hidden="true" />
                    <span className="sr-only">{t('a11y.externalLink')}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
