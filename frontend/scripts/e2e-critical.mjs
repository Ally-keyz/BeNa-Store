/**
 * Critical-path e2e using a local Vite server and mocked /api/v1 responses.
 * It never calls the live backend or Shopify, and it never presses checkout.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixturePath = fileURLToPath(new URL('../../src/fixtures/mock/data.ts', import.meta.url));

process.env.VITE_SOCKET_URL ??= 'http://127.0.0.1:9';

const { createServer, transformWithEsbuild } = await import('vite');

// Node cannot import TypeScript fixtures directly. Transpile the (type-only)
// fixture to ESM first so the script also runs on the pinned Node 20 toolchain.
const fixtureSource = fs.readFileSync(fixturePath, 'utf8');
const { code: fixtureCode } = await transformWithEsbuild(fixtureSource, fixturePath, {
  loader: 'ts',
  format: 'esm',
  target: 'esnext',
});
const {
  fixtureProducts,
  fixtureCollections,
  fixtureLocalization,
  fixturePolicies,
  money,
} = await import(`data:text/javascript;base64,${Buffer.from(fixtureCode).toString('base64')}`);
const react = (await import('@vitejs/plugin-react')).default;
const tailwindcss = (await import('@tailwindcss/vite')).default;

const PORT = 4178;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const NOW = '2026-11-19T12:00:00.000Z';

const productByVariant = new Map(
  fixtureProducts.flatMap((product) =>
    product.variants.map((variant) => [variant.id, product]),
  ),
);

function meta(pagination = false) {
  return {
    requestId: 'e2e-critical',
    generatedAt: NOW,
    dataSource: 'fixture',
    ...(pagination
      ? {
          pagination: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: 'e2e-end',
          },
        }
      : {}),
  };
}

const ok = (data, pagination = false) => ({ success: true, data, meta: meta(pagination) });
const fail = (code, message, status = 404) => ({
  status,
  body: { success: false, error: { code, message, requestId: 'e2e-critical' } },
});

function cartLine(product, quantity = 1) {
  const variant = product.variants[0];
  const each = variant.price;
  const subtotal = money(Number(each.amount) * quantity);
  return {
    id: `gid://shopify/CartLine/${variant.id}`,
    quantity,
    cost: {
      amountPerQuantity: each,
      subtotalAmount: subtotal,
      totalAmount: subtotal,
    },
    merchandise: {
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      availableForSale: variant.availableForSale,
      price: each,
      image: variant.image,
      product: {
        id: product.id,
        handle: product.handle,
        title: product.title,
        description: product.description,
        descriptionHtml: product.descriptionHtml,
        url: product.url,
      },
      selectedOptions: variant.selectedOptions,
    },
  };
}

function buildCart(lines = []) {
  const subtotalAmount = money(
    lines.reduce((sum, line) => sum + Number(line.cost.subtotalAmount.amount), 0),
  );
  return {
    id: 'gid://shopify/Cart/e2e-critical',
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    checkoutUrl: 'https://fixtures.invalid/checkout/e2e-critical',
    checkout: {
      hostedBy: 'shopify',
      url: 'https://fixtures.invalid/checkout/e2e-critical',
    },
    createdAt: NOW,
    updatedAt: NOW,
    cost: {
      subtotalAmount,
      totalAmount: subtotalAmount,
      totalTaxAmount: null,
      totalDutyAmount: null,
    },
    lines,
    discountCodes: [],
    buyerIdentity: {
      email: null,
      phone: null,
      countryCode: 'DE',
      customer: null,
    },
    deliveryGroups: [],
    warnings: [],
  };
}

const shipping = {
  policy: {
    title: 'Shipping policy',
    url: '/legal/shipping',
    summary: 'Delivery costs are calculated for the selected market at checkout.',
    euroAmounts: [],
  },
  markets: {
    availableCountries: [
      { isoCode: 'DE', name: 'Germany', currency: 'EUR' },
      { isoCode: 'FR', name: 'France', currency: 'EUR' },
    ],
    advertisedCountries: ['DE', 'FR'],
    advertisedButUnavailable: [],
    availableButNotAdvertised: [],
  },
  claims: { worldwide: false, evidence: null, mismatch: false },
  guidance: {
    hasUsableRateTable: false,
    rateExamples: [],
    gaps: ['Exact rates are confirmed at Shopify checkout.'],
  },
  cartEstimate: null,
  findings: [],
  limitations: ['Mocked e2e shipping data.'],
  generatedAt: NOW,
};

function seoMetadata(title, path) {
  return {
    title,
    description: 'Mocked SEO metadata for the critical e2e run.',
    canonicalUrl: `https://benaorigins.de${path}`,
    robots: 'index,follow',
    openGraph: { title, description: 'Mocked e2e metadata.', url: path, type: 'website', image: null },
    twitter: { card: 'summary_large_image', title, description: 'Mocked e2e metadata.', image: null },
    jsonLd: [],
  };
}

function collectionSummary(collection) {
  const { productIds, ...summary } = collection;
  return summary;
}

function collectionDetail(collection) {
  return {
    ...collectionSummary(collection),
    products: fixtureProducts.filter((product) => collection.productIds.includes(product.id)),
  };
}

function searchProducts(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return fixtureProducts;
  return fixtureProducts.filter((product) =>
    `${product.title} ${product.tags.join(' ')} ${product.productType}`.toLowerCase().includes(needle),
  );
}

async function run() {
  let server;
  let browser;
  const apiCalls = [];
  const unmockedCalls = [];
  const pageErrors = [];
  let checkoutUrlRequested = false;

  try {
    server = await createServer({
      root,
      configFile: false,
      plugins: [react(), tailwindcss()],
      resolve: { alias: { '@': path.join(root, 'src') } },
      server: { host: '127.0.0.1', port: PORT, strictPort: true, proxy: {} },
    });
    await server.listen();

    const executablePath = fs.existsSync(CHROME) ? CHROME : undefined;
    browser = await chromium.launch({ headless: true, executablePath });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      window.localStorage.setItem('bena.lang', 'en');
      window.localStorage.setItem(
        'bena.consent.v1',
        JSON.stringify({
          version: 1,
          decidedAt: '2026-11-19T12:00:00.000Z',
          categories: { essential: true, analytics: false, marketing: false },
        }),
      );
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);

    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });
    page.on('request', (request) => {
      if (request.url().includes('fixtures.invalid/checkout')) checkoutUrlRequested = true;
    });

    let cart = buildCart();

    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const rawPath = url.pathname.replace(/^\/api\/v1/, '');
      const apiPath = rawPath;
      const method = request.method();
      apiCalls.push(`${method} ${decodeURIComponent(apiPath)}`);

      const json = (payload, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
      const jsonError = (result) => json(result.body, result.status);

      if (apiPath === '/localization' && method === 'GET') return json(ok(fixtureLocalization));
      if (apiPath === '/auth/session' && method === 'GET') {
        return json(ok({ enabled: false, authenticated: false }));
      }
      if (apiPath === '/policies' && method === 'GET') return json(ok(fixturePolicies));
      if (apiPath === '/shipping' && method === 'GET') return json(ok(shipping));
      if (apiPath === '/catalog/facets' && method === 'GET') {
        return json(
          ok({
            categories: [
              { value: 'coffee', label: 'Coffee', count: fixtureProducts.length },
            ],
            brands: [
              { value: 'bena-origins', label: 'Bena Origins', count: fixtureProducts.length },
            ],
            dietary: [],
            origins: [{ value: 'rwanda', label: 'Rwanda', count: fixtureProducts.length }],
            scannedProducts: fixtureProducts.length,
            truncated: false,
            checkedAt: NOW,
          }),
        );
      }

      const reviewMatch = apiPath.match(/^\/reviews\/product\/([^/]+)$/);
      if (reviewMatch && method === 'GET') {
        return json(
          ok({
            handle: decodeURIComponent(reviewMatch[1]),
            status: 'not_configured',
            source: null,
            reviews: [],
            summary: { count: 0, averageRating: null },
            simulated: true,
            message: 'No review feed is configured.',
            checkedAt: NOW,
          }),
        );
      }

      if (apiPath === '/withdrawals' && method === 'POST') {
        return json(
          ok({
            reference: 'WD-E2E-000001',
            status: 'simulated',
            provider: 'mock',
            receivedAt: NOW,
            simulated: true,
            message: 'Simulated receipt.',
          }),
          201,
        );
      }

      if (apiPath === '/products' && method === 'GET') return json(ok(fixtureProducts, true));
      if (apiPath === '/collections' && method === 'GET') {
        return json(ok(fixtureCollections.map(collectionSummary), true));
      }
      if (apiPath === '/search' && method === 'GET') {
        return json(
          ok(
            { query: url.searchParams.get('q') ?? '', products: searchProducts(url.searchParams.get('q') ?? '') },
            true,
          ),
        );
      }
      if (apiPath === '/search/suggestions' && method === 'GET') {
        const items = searchProducts(url.searchParams.get('q') ?? '');
        return json(
          ok({
            products: items.map((product) => ({
              id: product.id,
              handle: product.handle,
              title: product.title,
              url: product.url,
              featuredImage: product.featuredImage,
              priceRange: product.priceRange,
            })),
            collections: [],
            pages: [],
            queries: [],
          }),
        );
      }

      const productMatch = apiPath.match(/^\/products\/([^/]+)$/);
      if (productMatch && method === 'GET') {
        const handle = decodeURIComponent(productMatch[1]);
        const product = fixtureProducts.find((item) => item.handle === handle);
        return product
          ? json(ok(product))
          : jsonError(fail('NOT_FOUND', 'Product not found'));
      }

      const collectionMatch = apiPath.match(/^\/collections\/([^/]+)$/);
      if (collectionMatch && method === 'GET') {
        const handle = decodeURIComponent(collectionMatch[1]);
        const collection = fixtureCollections.find((item) => item.handle === handle);
        return collection
          ? json(ok(collectionDetail(collection), true))
          : jsonError(fail('NOT_FOUND', 'Collection not found'));
      }

      if (apiPath.startsWith('/seo/') && method === 'GET') {
        const segments = apiPath.split('/').filter(Boolean);
        const handle = segments[2] ?? 'home';
        const title = handle === 'home' ? 'BeNa Origins — Rwandan products' : handle;
        return json(ok(seoMetadata(title, `/${handle}`)));
      }

      if (apiPath === '/cart' && method === 'POST') {
        const body = request.postDataJSON() ?? {};
        const lines = (body.lines ?? []).map((input) => {
          const product = productByVariant.get(input.merchandiseId) ?? fixtureProducts[0];
          return cartLine(product, input.quantity ?? 1);
        });
        cart = buildCart(lines);
        if (body.buyerIdentity?.countryCode) {
          cart.buyerIdentity.countryCode = body.buyerIdentity.countryCode;
        }
        return json(ok(cart));
      }

      const cartMatch = apiPath.match(/^\/cart\/([^/]+)$/);
      if (cartMatch && method === 'GET') {
        return decodeURIComponent(cartMatch[1]) === cart.id
          ? json(ok(cart))
          : jsonError(fail('NOT_FOUND', 'Cart expired'));
      }

      const cartLinesMatch = apiPath.match(/^\/cart\/([^/]+)\/lines$/);
      if (cartLinesMatch) {
        const body = request.postDataJSON() ?? {};
        if (method === 'POST') {
          const additions = (body.lines ?? []).map((input) => {
            const product = productByVariant.get(input.merchandiseId) ?? fixtureProducts[0];
            return cartLine(product, input.quantity ?? 1);
          });
          cart = buildCart([...cart.lines, ...additions]);
        } else if (method === 'PATCH') {
          for (const update of body.lines ?? []) {
            const line = cart.lines.find((item) => item.id === update.id);
            if (line) {
              line.quantity = update.quantity;
              const subtotal = money(Number(line.cost.amountPerQuantity.amount) * update.quantity);
              line.cost.subtotalAmount = subtotal;
              line.cost.totalAmount = subtotal;
            }
          }
          cart.totalQuantity = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
        } else if (method === 'DELETE') {
          const removed = new Set(body.lineIds ?? []);
          cart = buildCart(cart.lines.filter((line) => !removed.has(line.id)));
        }
        return json(ok(cart));
      }

      if (apiPath.match(/^\/cart\/[^/]+\/buyer-identity$/) && method === 'PATCH') {
        const body = request.postDataJSON() ?? {};
        if (body.buyerIdentity?.email !== undefined) cart.buyerIdentity.email = body.buyerIdentity.email;
        if (body.buyerIdentity?.countryCode !== undefined) {
          cart.buyerIdentity.countryCode = body.buyerIdentity.countryCode;
        }
        return json(ok(cart));
      }

      if (apiPath.match(/^\/cart\/[^/]+\/discount-codes$/) && method === 'PATCH') {
        return json(ok(cart));
      }

      if (apiPath === '/newsletter/subscribe' && method === 'POST') {
        return json(ok({ subscribed: true, simulated: true }));
      }

      if (apiPath.startsWith('/ai/suggestions/') && method === 'GET') {
        const unavailable = fail('SERVICE_UNAVAILABLE', 'AI suggestions are disabled in e2e.', 503);
        return json(unavailable.body, unavailable.status);
      }

      unmockedCalls.push(`${method} ${apiPath}`);
      const failure = fail('NOT_FOUND', `Unmocked API request: ${method} ${apiPath}`);
      return json(failure.body, failure.status);
    });

    const step = async (name, fn) => {
      process.stdout.write(`• ${name}\n`);
      await fn();
    };

    await step('home shell, exact navigation and header controls', async () => {
      await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Discover Rwanda in every box.' }).waitFor();
      const nav = page.getByRole('navigation', { name: 'Main navigation' });
      for (const label of ['Home', 'Rwandan Products', 'Catalog', 'About Us', 'Contact']) {
        await nav.getByRole('link', { name: label, exact: true }).waitFor();
      }

      const language = page.getByRole('group', { name: 'Language', exact: true });
      await language.getByRole('button', { name: 'English', exact: true }).waitFor();
      await page.getByLabel('Region and currency', { exact: true }).waitFor();

      // The appearance control defaults to system and can force dark mode.
      const appearance = page.getByRole('button', { name: 'Appearance', exact: true });
      await appearance.click();
      await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
      assert.equal(
        await page.locator('html.dark').count(),
        1,
        'Choosing Dark should apply the dark theme class.',
      );
      await appearance.click();
      await page.getByRole('menuitemradio', { name: 'System', exact: true }).click();
    });

    await step('home category filter uses the backend collection endpoint', async () => {
      await page.getByRole('button', { name: 'Coffee', exact: true }).click();
      await page.getByRole('link', { name: 'Rwanda Coffee 250g' }).first().waitFor();
      assert.ok(
        apiCalls.some((call) => call === 'GET /collections/coffee'),
        'Expected GET /collections/coffee after selecting the Coffee filter.',
      );
      const visibleCards = await page.locator('main article').count();
      assert.equal(visibleCards, 1, 'The Coffee filter should show only the backend coffee product.');
    });

    await step('catalog and search return live API products', async () => {
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'Catalog', exact: true })
        .click();
      await page.getByRole('heading', { name: 'Rwandan products, all in one place' }).waitFor();
      await page.locator('main').getByRole('link', { name: 'Rwanda Coffee 250g' }).waitFor();
      assert.ok(
        apiCalls.some((call) => call === 'GET /catalog/facets'),
        'Expected catalog facets to be loaded from the backend.',
      );
      const facetBrand = page.getByRole('button', { name: /Bena Origins/ });
      await facetBrand.waitFor();
      await facetBrand.click();
      assert.equal(await facetBrand.getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', { name: 'Clear filters' }).click();

      await page.getByRole('button', { name: 'Search', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Search products').fill('coffee');
      await dialog.getByRole('button', { name: 'Search', exact: true }).click();
      await page.getByRole('heading', { name: 'Results for “coffee”' }).waitFor();
      await page.locator('main').getByRole('link', { name: 'Rwanda Coffee 250g' }).waitFor();
    });

    await step('product detail adds to cart and exposes checkout handoff only', async () => {
      await page.locator('main').getByRole('link', { name: 'Rwanda Coffee 250g' }).click();
      await page.getByRole('heading', { name: 'Rwanda Coffee 250g' }).waitFor();
      await page.getByRole('heading', { name: 'Customer reviews' }).waitFor();
      assert.ok(
        apiCalls.some((call) => call.startsWith('GET /reviews/product/')),
        'Expected genuine product reviews to be read from the backend.',
      );
      await page.getByTestId('add-to-cart').click();
      // Adding no longer hijacks the page with the cart drawer; the top-centre
      // notification offers an explicit "View cart" action instead.
      await page.getByRole('button', { name: 'View cart', exact: true }).click();
      const checkout = page.getByRole('button', { name: 'Continue to checkout' });
      await checkout.waitFor();
      assert.equal(await checkout.isEnabled(), true, 'Checkout handoff should be available.');
      assert.ok(
        apiCalls.some((call) => call === 'POST /cart'),
        'Expected the cart to be created through the backend API.',
      );
      assert.equal(
        await page.locator('input[autocomplete^="cc-"], input[name*="card" i], input[name*="payment" i]').count(),
        0,
        'No payment fields may be rendered in the storefront.',
      );
    });

    await step('cart review shows the handoff without taking payment', async () => {
      await page.goto(`${ORIGIN}/cart`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Your cart' }).waitFor();
      const checkout = page.getByRole('button', { name: 'Continue to checkout' });
      await checkout.waitFor();
      assert.equal(await checkout.isEnabled(), true);
      assert.equal(
        await page.locator('input[autocomplete^="cc-"], input[name*="card" i], input[name*="payment" i]').count(),
        0,
        'No payment fields may be rendered on the cart review page.',
      );
    });

    await step('coming-soon product never offers add-to-cart', async () => {
      await page.goto(`${ORIGIN}/products/coming-soon`, { waitUntil: 'domcontentloaded' });
      await page.getByText('This item is not available to add to the cart yet.').waitFor();
      assert.equal(await page.getByTestId('add-to-cart').count(), 0);
      await page.getByRole('link', { name: 'Ask about availability' }).waitFor();
    });

    await step('withdrawal form submits through the backend and shows a reference', async () => {
      await page.goto(`${ORIGIN}/legal/withdrawal`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Withdrawal declaration' }).waitFor();
      await page.getByLabel('Order number').fill('E2E-1001');
      await page.getByLabel('Email address used for the order').fill('shopper@example.invalid');
      await page.getByLabel('Full name').fill('Test Shopper');
      await page.getByLabel('Order date').fill('2026-11-01');
      await page.getByRole('checkbox', { name: /I confirm that I am withdrawing/ }).check();
      await page.getByRole('button', { name: 'Submit withdrawal' }).click();
      await page.getByText(/WD-E2E-000001/).waitFor();
      assert.ok(
        apiCalls.some((call) => call === 'POST /withdrawals'),
        'Expected the withdrawal declaration to be sent to the backend.',
      );
    });

    assert.equal(checkoutUrlRequested, false, 'The checkout URL must never be requested by e2e.');
    assert.deepEqual(pageErrors, [], `Page errors during e2e: ${pageErrors.map(String).join(', ')}`);
    assert.deepEqual(unmockedCalls, [], `Unexpected unmocked API calls: ${unmockedCalls.join(', ')}`);
    process.stdout.write(`\nCritical e2e passed (${apiCalls.length} mocked API calls). Checkout was never opened.\n`);
  } finally {
    await browser?.close();
    await server?.close();
  }
}

run().catch((error) => {
  console.error('\nCritical e2e failed:\n', error);
  process.exitCode = 1;
});
