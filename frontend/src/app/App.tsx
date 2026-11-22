import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RootLayout } from '@/components/layout/RootLayout';
import { Skeleton } from '@/components/ui/Skeleton';
import { pageContainer } from '@/lib/layout';
import { RouteErrorBoundary } from './RouteErrorBoundary';

const HomePage = lazy(() => import('@/routes/Home').then((module) => ({ default: module.HomePage })));
const CatalogPage = lazy(() =>
  import('@/routes/Catalog').then((module) => ({ default: module.CatalogPage })),
);
const CollectionsPage = lazy(() =>
  import('@/routes/Collections').then((module) => ({ default: module.CollectionsPage })),
);
const CollectionPage = lazy(() =>
  import('@/routes/Collection').then((module) => ({ default: module.CollectionPage })),
);
const AfricanProductsPage = lazy(() =>
  import('@/routes/AfricanProducts').then((module) => ({ default: module.AfricanProductsPage })),
);
const ProductStoryPage = lazy(() =>
  import('@/routes/ProductStory').then((module) => ({ default: module.ProductStoryPage })),
);
const ProductPage = lazy(() =>
  import('@/routes/Product').then((module) => ({ default: module.ProductPage })),
);
const SearchPage = lazy(() =>
  import('@/routes/Search').then((module) => ({ default: module.SearchPage })),
);
const CartPage = lazy(() => import('@/routes/Cart').then((module) => ({ default: module.CartPage })));
const AboutPage = lazy(() =>
  import('@/routes/About').then((module) => ({ default: module.AboutPage })),
);
const ContactPage = lazy(() =>
  import('@/routes/Contact').then((module) => ({ default: module.ContactPage })),
);
const ShippingPage = lazy(() =>
  import('@/routes/Shipping').then((module) => ({ default: module.ShippingPage })),
);
const FaqPage = lazy(() => import('@/routes/Faq').then((module) => ({ default: module.FaqPage })));
const LegalPage = lazy(() =>
  import('@/routes/Legal').then((module) => ({ default: module.LegalPage })),
);
const AccountPage = lazy(() =>
  import('@/routes/Account').then((module) => ({ default: module.AccountPage })),
);
const AccountLoginPage = lazy(() =>
  import('@/routes/AccountLogin').then((module) => ({ default: module.AccountLoginPage })),
);
const OrdersPage = lazy(() =>
  import('@/routes/Orders').then((module) => ({ default: module.OrdersPage })),
);
const AddressesPage = lazy(() =>
  import('@/routes/Addresses').then((module) => ({ default: module.AddressesPage })),
);
const NotFoundPage = lazy(() =>
  import('@/routes/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const LegacyRedirect = lazy(() =>
  import('@/routes/LegacyRedirect').then((module) => ({ default: module.LegacyRedirect })),
);

function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div className={pageContainer} aria-label={t('a11y.loading')}>
      <div className="py-10">
        <Skeleton className="h-[380px] w-full rounded-hero sm:h-[420px]" />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item}>
              <Skeleton className="aspect-square w-full rounded-card" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<RootLayout />} errorElement={<RouteErrorBoundary />}>
            <Route index element={<HomePage />} />

            <Route path="shop" element={<Navigate to="/catalog" replace />} />
            <Route path="african-products" element={<AfricanProductsPage />} />
            <Route path="rwandan-products" element={<Navigate to="/african-products" replace />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="collections/:handle" element={<CollectionPage />} />
            <Route path="products/:handle" element={<ProductPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="cart" element={<CartPage />} />

            <Route path="about" element={<AboutPage />} />
            <Route path="about/products/:slug" element={<ProductStoryPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="shipping" element={<ShippingPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="legal/:page" element={<LegalPage />} />

            <Route path="account" element={<AccountPage />} />
            <Route path="account/login" element={<AccountLoginPage />} />
            <Route path="account/orders" element={<OrdersPage />} />
            <Route path="account/addresses" element={<AddressesPage />} />
            <Route path="orders" element={<Navigate to="/account/orders" replace />} />
            <Route path="addresses" element={<Navigate to="/account/addresses" replace />} />

            {/* Shopify-era URLs; Render serves 301s for these in production. */}
            <Route path="pages/:handle" element={<LegacyRedirect kind="page" />} />
            <Route path="policies/:handle" element={<LegacyRedirect kind="policy" />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
