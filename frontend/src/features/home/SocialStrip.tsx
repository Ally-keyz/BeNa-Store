import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Music2 } from 'lucide-react';
import { BRAND } from '@/config';
import { cn } from '@/lib/cn';
import { contentContainer } from '@/lib/layout';

const SOCIALS = [
  { href: BRAND.social.instagram, label: 'Instagram', Icon: Instagram },
  { href: BRAND.social.facebook, label: 'Facebook', Icon: Facebook },
  { href: BRAND.social.tiktok, label: 'TikTok', Icon: Music2 },
] as const;

/** Thin strip directly under the hero, matching the reference layout. */
export function SocialStrip() {
  const { t } = useTranslation();

  return (
    <section className="border-b border-terra-100" aria-label={t('footer.socialLabel', { brand: BRAND.name })}>
      <div className={cn(contentContainer, 'flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between')}>
        <p className="text-[13px] text-neutral-600">{t('home.socialPrompt')}</p>
        <ul className="flex items-center gap-2">
          {SOCIALS.map(({ href, label, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} — ${t('a11y.externalLink')}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-terra-200 text-terra-800 transition-colors hover:border-terra-900 hover:bg-terra-50"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
