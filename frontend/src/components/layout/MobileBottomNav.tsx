import { Home, LayoutGrid, Menu, Search, ShoppingBag } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useCart } from '@/context/CartContext';

export interface MobileBottomNavProps {
  onMenu: () => void;
  onSearch: () => void;
}

function itemClass(active: boolean): string {
  return cn(
    'relative flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors',
    active ? 'text-brand-dark' : 'text-neutral-600 hover:text-ink',
  );
}

function itemLabel(active: boolean): string {
  return cn('leading-none', active && 'font-semibold');
}

export function MobileBottomNav({ onMenu, onSearch }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { itemCount, openCart } = useCart();

  const homeActive = pathname === '/';
  const shopActive =
    pathname.startsWith('/catalog') ||
    pathname.startsWith('/rwandan-products') ||
    pathname.startsWith('/collections') ||
    pathname.startsWith('/products');
  const searchActive = pathname.startsWith('/search');
  const cartLabel = itemCount > 0 ? t('header.cartCount', { count: itemCount }) : t('a11y.openCart');

  return (
    <nav
      aria-label={t('a11y.mainNav')}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200/80 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-paper/85 lg:hidden"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-stretch gap-0.5 px-2">
        <NavLink to="/" end className={() => itemClass(homeActive)} aria-current={homeActive ? 'page' : undefined}>
          <Home className="h-5 w-5" aria-hidden="true" />
          <span className={itemLabel(homeActive)}>{t('nav.home')}</span>
        </NavLink>

        <Link
          to="/catalog"
          className={itemClass(shopActive)}
          aria-current={shopActive ? 'page' : undefined}
        >
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          <span className={itemLabel(shopActive)}>{t('nav.shop')}</span>
        </Link>

        <button
          type="button"
          onClick={onSearch}
          className={itemClass(searchActive)}
          aria-label={t('common.search')}
        >
          <Search className="h-5 w-5" aria-hidden="true" />
          <span className={itemLabel(searchActive)}>{t('common.search')}</span>
        </button>

        <button type="button" onClick={openCart} className={itemClass(false)} aria-label={cartLabel}>
          <span className="relative">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {itemCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold leading-none text-on-brand"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            ) : null}
          </span>
          <span className="leading-none">{t('common.cart')}</span>
        </button>

        <button type="button" onClick={onMenu} className={itemClass(false)} aria-label={t('a11y.openMenu')}>
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="leading-none">{t('common.menu')}</span>
        </button>
      </div>
    </nav>
  );
}
