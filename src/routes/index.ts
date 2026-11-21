import { Router, type RequestHandler } from 'express';
import type { Container } from '../container';
import { validate, getValidated } from '../middleware/validate';
import { rateLimiters } from '../middleware/rateLimit';
import { enforceTrustedOrigin } from '../middleware/enforceTrustedOrigin';
import { asyncHandler } from '../utils/http';
import { success } from '../utils/response';
import { z } from 'zod';
import {
  addCartLinesBody,
  aiSuggestParams,
  aiSuggestQuery,
  auditCatalogQuery,
  auditProductParams,
  catalogFacetsQuery,
  collectionDetailQuery,
  createCartBody,
  listCollectionsQuery,
  listProductsQuery,
  localizationQuery,
  newsletterBody,
  productByHandle,
  productReviewsParams,
  productReviewsQuery,
  removeCartLinesBody,
  restockSubscribeBody,
  searchQuery,
  shippingQuery,
  sitemapQuery,
  suggestionsQuery,
  submitReviewBody,
  updateBuyerIdentityBody,
  updateCartLinesBody,
  updateDiscountCodesBody,
  withdrawalBody,
} from '../schemas/requests';
import {
  cartIdParams,
  emptyQuery,
  handleParams,
  marketContextQuery,
} from '../schemas/common';
import {
  baseMeta,
  catalogController,
  insightsController,
} from '../controllers/catalog.controller';
import {
  cartController,
  communicationsController,
  contentController,
} from '../controllers/commerce.controller';
import { authController } from '../controllers/auth.controller';
import {
  accountAddressesQuery,
  accountOrdersQuery,
  associateCartBody,
  callbackQuery,
  loginQuery,
} from '../schemas/auth';

export interface ApiRouterDependencies {
  limiters: ReturnType<typeof rateLimiters>;
  adminGuard: RequestHandler;
}

export function createApiRouter(
  container: Container,
  dependencies: ApiRouterDependencies,
): Router {
  const router = Router();
  const catalog = catalogController(container);
  const cart = cartController(container);
  const content = contentController(container);
  const comms = communicationsController(container);
  const insights = insightsController(container);
  const auth = authController(container);
  const { limiters, adminGuard } = dependencies;
  const trustedOrigin = enforceTrustedOrigin(container.config);

  const noStore: RequestHandler = (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    next();
  };
  router.use('/auth', noStore);
  router.use('/account', noStore);

  // ------------------------------------------------------------- catalog ---
  router.get('/products', validate({ query: listProductsQuery }), catalog.listProducts);
  router.get('/products/:handle', validate({ params: productByHandle, query: marketContextQuery }), catalog.getProduct);

  router.get('/collections', validate({ query: listCollectionsQuery }), catalog.listCollections);
  router.get(
    '/collections/:handle',
    validate({ params: handleParams, query: collectionDetailQuery }),
    catalog.getCollection,
  );

  router.get('/search', validate({ query: searchQuery }), catalog.search);
  router.get('/search/suggestions', validate({ query: suggestionsQuery }), catalog.suggest);

  // ---------------------------------------------------------------- cart ---
  router.post('/cart', limiters.cart, validate({ body: createCartBody }), cart.create);
  router.get('/cart/:cartId', validate({ params: cartIdParams, query: emptyQuery }), cart.get);
  router.post(
    '/cart/:cartId/lines',
    limiters.cart,
    validate({ params: cartIdParams, body: addCartLinesBody }),
    cart.addLines,
  );
  router.patch(
    '/cart/:cartId/lines',
    limiters.cart,
    validate({ params: cartIdParams, body: updateCartLinesBody }),
    cart.updateLines,
  );
  router.delete(
    '/cart/:cartId/lines',
    limiters.cart,
    validate({ params: cartIdParams, body: removeCartLinesBody }),
    cart.removeLines,
  );
  router.patch(
    '/cart/:cartId/buyer-identity',
    limiters.cart,
    validate({ params: cartIdParams, body: updateBuyerIdentityBody }),
    cart.updateBuyerIdentity,
  );
  router.patch(
    '/cart/:cartId/discount-codes',
    limiters.cart,
    validate({ params: cartIdParams, body: updateDiscountCodesBody }),
    cart.updateDiscountCodes,
  );

  // ------------------------------------------------- localization/content ---
  router.get('/localization', validate({ query: localizationQuery }), content.localization);
  router.get('/shipping', validate({ query: shippingQuery }), content.shipping);
  router.get('/policies', validate({ query: emptyQuery }), content.policies);
  router.get(
    '/catalog/facets',
    validate({ query: catalogFacetsQuery }),
    comms.facets,
  );

  // -------------------------------------------------------- communications ---
  router.post(
    '/newsletter/subscribe',
    limiters.newsletter,
    validate({ body: newsletterBody }),
    comms.newsletter,
  );
  router.post(
    '/restock/subscribe',
    limiters.restock,
    trustedOrigin,
    validate({ body: restockSubscribeBody }),
    comms.restockSubscribe,
  );
  router.get(
    '/reviews/assessment',
    adminGuard,
    validate({ query: emptyQuery }),
    comms.reviewsAssessment,
  );
  router.get(
    '/reviews/product/:handle',
    validate({ params: productReviewsParams, query: productReviewsQuery }),
    comms.productReviews,
  );
  router.post(
    '/reviews/product/:handle',
    limiters.reviews,
    trustedOrigin,
    validate({ params: productReviewsParams, body: submitReviewBody }),
    comms.submitProductReview,
  );
  router.post(
    '/withdrawals',
    limiters.withdrawal,
    trustedOrigin,
    validate({ body: withdrawalBody }),
    comms.withdrawal,
  );

  // -------------------------------------------------------- authentication ---
  router.get('/auth/login', limiters.auth, validate({ query: loginQuery }), auth.login);
  router.get('/auth/callback', limiters.auth, validate({ query: callbackQuery }), auth.callback);
  router.post(
    '/auth/logout',
    limiters.auth,
    trustedOrigin,
    validate({ query: emptyQuery }),
    auth.logout,
  );
  router.get('/auth/session', limiters.auth, validate({ query: emptyQuery }), auth.session);

  router.get('/account/me', validate({ query: emptyQuery }), auth.me);
  router.get(
    '/account/orders',
    validate({ query: accountOrdersQuery }),
    auth.orders,
  );
  router.get(
    '/account/addresses',
    validate({ query: accountAddressesQuery }),
    auth.addresses,
  );
  router.post(
    '/account/cart/associate',
    trustedOrigin,
    validate({ body: associateCartBody }),
    auth.associateCart,
  );

  // -------------------------------------------------------------- insights ---
  router.get(
    '/audit/products',
    adminGuard,
    validate({ query: auditCatalogQuery }),
    insights.auditCatalog,
  );
  router.get(
    '/audit/products/:handle',
    adminGuard,
    validate({ params: auditProductParams, query: marketContextQuery }),
    insights.auditProduct,
  );

  // ---------------------------------------------------------------------- ai ---
  router.get(
    '/ai/suggestions/:handle',
    limiters.ai,
    validate({ params: aiSuggestParams, query: aiSuggestQuery }),
    asyncHandler(async (_req, res) => {
      const { params, query } = getValidated<{
        params: z.infer<typeof aiSuggestParams>;
        query: z.infer<typeof aiSuggestQuery>;
      }>(res);
      const product = await container.services.products.byHandle(params.handle, query);
      const suggestion = await container.services.ai.suggest(product, { refresh: query.refresh });
      res.json(success(res, suggestion, baseMeta(container)));
    }),
  );

  // ------------------------------------------------------------------- seo ---
  router.get(
    '/seo/product/:handle',
    validate({ params: handleParams, query: marketContextQuery }),
    insights.seoProduct,
  );
  router.get(
    '/seo/collection/:handle',
    validate({ params: handleParams, query: marketContextQuery }),
    insights.seoCollection,
  );
  router.get(
    '/seo/page/:handle',
    validate({ params: handleParams, query: emptyQuery }),
    insights.seoPage,
  );
  router.get('/seo/sitemap', validate({ query: sitemapQuery }), insights.sitemap);
  router.get('/seo/sitemap.xml', validate({ query: sitemapQuery }), insights.sitemapXml);
  router.get('/seo/robots', validate({ query: emptyQuery }), insights.robots);
  router.get('/seo/robots.txt', validate({ query: emptyQuery }), insights.robotsTxt);

  return router;
}
