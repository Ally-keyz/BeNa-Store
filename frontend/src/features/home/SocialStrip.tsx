import { useTranslation } from 'react-i18next';
import { Instagram, MessageCircle } from 'lucide-react';
import { BRAND } from '@/config';
import { cn } from '@/lib/cn';
import { contentContainer } from '@/lib/layout';

const SOCIALS = [
  { href: BRAND.social.instagram, label: 'Instagram', Icon: Instagram },
  { href: BRAND.social.whatsapp, label: 'WhatsApp', Icon: MessageCircle },
] as const;

/** Thin strip directly under the hero, matching the reference layout. */
export function SocialStrip() {
  const { t } = useTranslation();

  return (
    <section className="border-b border-terra-100" aria-label={t('footer.socialLabel', { brand: BRAND.name })}>
      <div className={cn(contentContainer, 'flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between')}>
        <p className="text-[13px] text-neutral-600">{t('home.socialPrompt')}</p>
        <ul className="flex flex-wrap items-center gap-2">
          {SOCIALS.map(({ href, label, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} — ${t('a11y.externalLink')}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-terra-200 px-3 text-[13px] font-medium text-terra-800 transition-colors hover:border-terra-900 hover:bg-terra-50 sm:min-h-9 sm:px-3"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
