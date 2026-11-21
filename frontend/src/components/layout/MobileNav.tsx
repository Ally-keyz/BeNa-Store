import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Mail } from 'lucide-react';
import { BRAND } from '@/config';
import { cn } from '@/lib/cn';
import { Drawer } from '@/components/ui/Drawer';
import { ThemeSegmented } from '@/components/ui/ThemeToggle';
import { LanguageSwitch } from './LanguageSwitch';
import { RegionSelector } from './RegionSelector';

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

const PRIMARY_LINKS = [
  { href: '/', labelKey: 'nav.home', end: true },
  { href: '/african-products', labelKey: 'nav.africanProducts' },
  { href: '/catalog', labelKey: 'nav.catalog' },
  { href: '/about', labelKey: 'nav.about' },
  { href: '/contact', labelKey: 'nav.contact' },
] as const;

const SECONDARY_LINKS = [
  { href: '/shipping', labelKey: 'nav.shipping' },
] as const;

function itemClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex min-h-11 items-center justify-between rounded-lg px-2 text-[15px] transition-colors',
    isActive ? 'bg-terra-50 font-medium text-ink' : 'text-neutral-800 hover:bg-terra-50',
  );
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const { t } = useTranslation();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('header.menuTitle')}
      side="left"
      closeLabel={t('a11y.closeMenu')}
    >
      <nav aria-label={t('a11y.mainNav')}>
        <ul className="space-y-1">
          {PRIMARY_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink
                to={link.href}
                end={'end' in link && link.end}
                onClick={onClose}
                className={itemClass}
              >
                {t(link.labelKey)}
                <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="my-5 border-t border-terra-100" />

        <ul className="space-y-1">
          {SECONDARY_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink to={link.href} onClick={onClose} className={itemClass}>
                {t(link.labelKey)}
                <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-5 border-t border-terra-100 pt-5">
        <div>
          <p className="px-2 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {t('theme.label')}
          </p>
          <ThemeSegmented className="mt-2.5" />
        </div>
        <div>
          <p className="px-2 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {t('header.language')}
          </p>
          <LanguageSwitch size="md" variant="inline" className="mt-2.5" />
        </div>
        <div>
          <p className="px-2 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {t('remediation.regionLabel')}
          </p>
          <RegionSelector variant="full" className="mt-2.5 rounded-xl" />
        </div>
        <a
          href={`mailto:${BRAND.contactEmail}`}
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-neutral-700 hover:bg-terra-50 hover:text-ink"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {BRAND.contactEmail}
        </a>
        <Link
          to="/legal/privacy"
          onClick={onClose}
          className="block px-2 text-[13px] text-neutral-600 underline underline-offset-2 hover:text-ink"
        >
          {t('footer.privacy')}
        </Link>
      </div>
    </Drawer>
  );
}
