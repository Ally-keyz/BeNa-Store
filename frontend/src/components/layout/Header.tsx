import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Search, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pageContainer } from '@/lib/layout';
import { useCart } from '@/context/CartContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { LanguageSwitch } from './LanguageSwitch';
import { MobileNav } from './MobileNav';

const DESKTOP_LINKS = [
  { href: '/shop', labelKey: 'nav.shop', end: true },
  { href: '/collections/coffee', labelKey: 'nav.coffee' },
  { href: '/collections/food', labelKey: 'nav.food' },
  { href: '/collections/crafts', labelKey: 'nav.crafts' },
  { href: '/about', labelKey: 'nav.about' },
] as const;

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'relative rounded-sm px-1 py-2 text-sm transition-colors duration-200',
    isActive ? 'text-ink' : 'text-neutral-700 hover:text-ink',
    isActive &&
      'after:absolute after:inset-x-1 after:-bottom-0.5 after:h-px after:bg-chocolate-900',
  );
}

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const cartLabel =
    itemCount > 0 ? t('header.cartCount', { count: itemCount }) : t('a11y.openCart');

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-chocolate-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className={cn(pageContainer, 'flex h-14 items-center justify-between gap-4 lg:h-16')}>
          <div className="flex items-center gap-2 lg:gap-8">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-chocolate-50 lg:hidden"
              aria-label={t('a11y.openMenu')}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <BrandLogo />

            <nav aria-label={t('a11y.mainNav')} className="hidden lg:block">
              <ul className="flex items-center gap-6">
                {DESKTOP_LINKS.map((link) => (
                  <li key={link.href}>
                    <NavLink to={link.href} end={'end' in link && link.end} className={navLinkClass}>
                      {t(link.labelKey)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitch className="mr-1 hidden lg:inline-flex" />

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-chocolate-50"
              aria-label={t('common.search')}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>

            <Link
              to="/cart"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-chocolate-50"
              aria-label={cartLabel}
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {itemCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-chocolate-900 px-1 text-[10px] font-semibold leading-none text-white"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />

      <Dialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title={t('header.searchTitle')}
        description={t('header.searchHint')}
        closeLabel={t('header.closeSearch')}
      >
        <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row">
          <Input
            label={t('header.searchLabel')}
            hideLabel
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('header.searchLabel')}
            autoComplete="off"
            autoFocus
          />
          <Button type="submit" className="shrink-0">
            {t('header.searchSubmit')}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
