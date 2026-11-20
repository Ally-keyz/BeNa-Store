import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ShoppingBag } from 'lucide-react';
import { BRAND } from '@/config';
import { cn } from '@/lib/cn';
import { pageContainer } from '@/lib/layout';
import { useCart } from '@/context/CartContext';
import logoUrl from '@/assets/logo.webp';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MobileNav } from './MobileNav';
import { LanguageSwitch } from './LanguageSwitch';

const DESKTOP_LINKS = [
  { href: '/', labelKey: 'nav.home', end: true },
  { href: '/rwandan-products', labelKey: 'nav.rwandanProducts' },
  { href: '/catalog', labelKey: 'nav.catalog' },
  { href: '/about', labelKey: 'nav.about' },
  { href: '/contact', labelKey: 'nav.contact' },
] as const;

/** Floating "pill" nav: quiet by default, crisp white chip on the active route. */
function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-2 text-[13.5px] font-medium tracking-[-0.005em] transition-colors duration-200 xl:px-3.5',
    isActive
      ? 'bg-neutral-100 font-semibold text-ink'
      : 'text-neutral-700 hover:bg-neutral-100 hover:text-ink',
  );
}

/**
 * The logo artwork is a full lock-up with baked-in lettering, which turns to
 * mush at navbar size. The tile shows only the emblem (woman, coffee branch,
 * hills) and pairs it with a crisp typographic wordmark instead.
 */
function BrandMark() {
  return (
    <Link
      to="/"
      aria-label={`${BRAND.name} — home`}
      className="group inline-flex items-center gap-2.5 rounded-full focus-visible:outline-offset-4 sm:gap-3"
    >
      <span className="relative block h-11 w-14 shrink-0 overflow-hidden bg-white  transition-shadow duration-300 ">
        <img
          src={logoUrl}
          alt=""
          width={56}
          height={44}
          className="absolute left-1/2 top-0 h-[92px] w-auto max-w-none -translate-x-1/2"
          loading="eager"
        />
      </span>
      <span className="hidden leading-none min-[360px]:block">
        <span className="block font-display mt-2 text-[17px] font-semibold tracking-[-0.03em] text-ink">
          {BRAND.name}
        </span>
      </span>
    </Link>
  );
}

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { itemCount, openCart } = useCart();
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
      <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-paper/85 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/75">

        <div
          className={cn(
            pageContainer,
            'relative flex h-16 items-center justify-between gap-4 lg:h-[72px]',
          )}
        >
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="-ml-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100 lg:hidden"
              aria-label={t('a11y.openMenu')}
            >
              <span className="sr-only">{t('a11y.openMenu')}</span>
              <MenuIcon />
            </button>

            <BrandMark />
          </div>

          <nav
            aria-label={t('a11y.mainNav')}
            className="hidden lg:flex lg:flex-1 lg:justify-center xl:absolute xl:left-1/2 xl:top-1/2 xl:flex-none xl:-translate-x-1/2 xl:-translate-y-1/2"
          >
            <ul className="flex items-center gap-0.5 rounded-full p-1">
              {DESKTOP_LINKS.map((link) => (
                <li key={link.href}>
                  <NavLink to={link.href} end={'end' in link && link.end} className={navLinkClass}>
                    {({ isActive }) => (
                      <>
                        <span>{t(link.labelKey)}</span>
                        {isActive ? (
                          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-brand" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-ink"
              aria-label={t('common.search')}
            >
              <Search className="h-[19px] w-[19px]" aria-hidden="true" />
            </button>

            <ThemeToggle className="hidden sm:inline-flex" />
            <LanguageSwitch className="hidden sm:inline-flex" />

            <button
              type="button"
              onClick={openCart}
              className="relative inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200/80 bg-surface pl-3 pr-3 text-ink transition-colors hover:bg-neutral-100 sm:pl-3.5 sm:pr-2.5"
              aria-label={cartLabel}
            >
              <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" />
              {itemCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-none text-on-brand"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              ) : null}
            </button>
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
        <form onSubmit={onSearch} className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-terra-50 p-1.5">
            <Input
              label={t('header.searchLabel')}
              hideLabel
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('header.searchLabel')}
              autoComplete="off"
              autoFocus
              containerClassName="flex-1"
              className="h-10 border-0 bg-transparent px-3 text-[13.5px] focus-visible:border-0"
            />
            <button
              type="submit"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand transition-colors hover:bg-brand-dark"
              aria-label={t('header.searchSubmit')}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-[13px] text-neutral-600">
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="underline underline-offset-2 hover:text-ink"
            >
              {BRAND.contactEmail}
            </a>
          </p>
        </form>
      </Dialog>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
