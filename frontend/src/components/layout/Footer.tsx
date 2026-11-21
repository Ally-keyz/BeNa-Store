import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Instagram, MessageCircle } from 'lucide-react';
import { BRAND } from '@/config';
import { cn } from '@/lib/cn';
import { pageContainer } from '@/lib/layout';
import { useConsent } from '@/context/ConsentContext';

const SOCIALS = [
  { href: BRAND.social.instagram, label: 'Instagram', Icon: Instagram },
  { href: BRAND.social.whatsapp, label: 'WhatsApp', Icon: MessageCircle },
] as const;

const COLUMNS = [
  {
    headingKey: 'footer.shopHeading',
    links: [
      { href: '/rwandan-products', key: 'nav.rwandanProducts' },
      { href: '/catalog', key: 'nav.catalog' },
      { href: '/collections/coffee', key: 'nav.coffee' },
      { href: '/collections/food', key: 'nav.food' },
      { href: '/collections/crafts', key: 'nav.crafts' },
    ],
  },
  {
    headingKey: 'footer.companyHeading',
    links: [
      { href: '/about', key: 'footer.about' },
      { href: '/contact', key: 'footer.contact' },
      { href: '/shipping', key: 'footer.shipping' },
      { href: '/faq', key: 'footer.faq' },
    ],
  },
  {
    headingKey: 'footer.legalHeading',
    links: [
      { href: '/legal/impressum', key: 'footer.imprint' },
      { href: '/legal/privacy', key: 'footer.privacy' },
      { href: '/legal/withdrawal', key: 'footer.withdrawal' },
      { href: '/legal/terms', key: 'footer.terms' },
    ],
  },
] as const;

export function Footer() {
  const { t } = useTranslation();
  const { openPreferences } = useConsent();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-night text-white">
      <div className={cn(pageContainer, 'grid gap-8 py-12 sm:gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:py-16')}>
        <div className="max-w-sm">
          <p className="font-display text-xl font-semibold tracking-tight">{BRAND.name}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
            {BRAND.slogan}
          </p>
          <p className="mt-4 text-sm leading-6 text-white/70">{t('footer.tagline')}</p>

          <a
            href={`mailto:${BRAND.contactEmail}`}
            className="mt-4 inline-block rounded-sm text-sm text-white/80 underline underline-offset-4 hover:text-white"
          >
            {BRAND.contactEmail}
          </a>

          <ul aria-label={t('footer.socialLabel', { brand: BRAND.name })} className="mt-6 flex items-center gap-2">
            {SOCIALS.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} — ${t('a11y.externalLink')}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.headingKey}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              {t(column.headingKey)}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="inline-flex min-h-11 items-center rounded-sm text-sm text-white/75 transition-colors hover:text-white"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div
          className={cn(
            pageContainer,
            'flex flex-col gap-3 py-5 text-[12px] text-white/55 sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <p>{t('footer.rights', { year, brand: BRAND.name })}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={openPreferences}
              className="inline-flex min-h-11 items-center rounded-sm underline underline-offset-2 hover:text-white"
            >
              {t('footer.cookieSettings')}
            </button>
            <p>{t('footer.paymentNote')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
