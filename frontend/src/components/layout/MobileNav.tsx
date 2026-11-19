import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Mail } from 'lucide-react';
import { BRAND } from '@/config';
import { cn } from '@/lib/cn';
import { Drawer } from '@/components/ui/Drawer';
import { LanguageSwitch } from './LanguageSwitch';

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

const PRIMARY_LINKS = [
  { href: '/shop', labelKey: 'nav.shopAll', end: true },
  { href: '/collections/coffee', labelKey: 'nav.coffee' },
  { href: '/collections/food', labelKey: 'nav.food' },
  { href: '/collections/crafts', labelKey: 'nav.crafts' },
] as const;

const SECONDARY_LINKS = [
  { href: '/about', labelKey: 'nav.about' },
  { href: '/contact', labelKey: 'nav.contact' },
  { href: '/shipping', labelKey: 'nav.shipping' },
] as const;

function itemClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex min-h-11 items-center justify-between rounded-lg px-2 text-[15px] transition-colors',
    isActive ? 'bg-chocolate-50 font-medium text-ink' : 'text-neutral-800 hover:bg-chocolate-50',
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

        <div className="my-5 border-t border-chocolate-100" />

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

      <div className="mt-8 space-y-5 border-t border-chocolate-100 pt-5">
        <LanguageSwitch size="md" />
        <a
          href={`mailto:${BRAND.contactEmail}`}
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-neutral-700 hover:bg-chocolate-50 hover:text-ink"
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
