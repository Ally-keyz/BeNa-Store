import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StorefrontSocketBridge } from '@/app/StorefrontSocketBridge';
import { CartDrawer } from '@/components/commerce/CartDrawer';
import { PageTransition } from '@/components/motion/PageTransition';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { Header } from './Header';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';
import { OpeningScreen } from './OpeningScreen';

/** Reset scroll on navigation (except when jumping to an in-page anchor). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);
  return null;
}

export function RootLayout() {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-screen flex-col">
      <ScrollProgress />
      <OpeningScreen />
      <ScrollToTop />
      <StorefrontSocketBridge />

      <div className="relative z-10 flex flex-1 flex-col">
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[110] -translate-y-[200%] rounded-full bg-brand px-5 py-2.5 text-sm font-medium transition-transform focus:translate-y-0"
        >
          {t('a11y.skipToContent')}
        </a>

        <Header />

        <main id="main-content" tabIndex={-1} className="flex-1 focus-visible:outline-none">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>

        <Footer />
      </div>

      <CookieConsent />
      <CartDrawer />
    </div>
  );

}
