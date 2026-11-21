import type { Logger } from 'pino';
import type { AppConfig } from './config/env';
import type { CommerceClient } from './types/domain';
import type { RealtimePublisher } from './sockets/publisher';
import { noopPublisher } from './sockets/publisher';
import { AuditService } from './services/audit.service';
import { CartService } from './services/cart.service';
import {
  CollectionsService,
  LocalizationService,
  ProductsService,
  SearchService,
} from './services/catalog.service';
import { HealthService } from './services/health.service';
import { NewsletterService } from './services/newsletter.service';
import { RestockService } from './services/restock.service';
import { createRestockStore } from './services/restockStore';
import { PoliciesService } from './services/policies.service';
import { ReviewsService } from './services/reviews.service';
import { SeoService } from './services/seo.service';
import { ShippingService } from './services/shipping.service';
import { CustomerAuthService } from './services/customerAuth.service';
import { AiService } from './services/ai.service';
import { FacetsService } from './services/facets.service';
import { WithdrawalService } from './services/withdrawal.service';

export interface Services {
  products: ProductsService;
  collections: CollectionsService;
  search: SearchService;
  cart: CartService;
  localization: LocalizationService;
  shipping: ShippingService;
  policies: PoliciesService;
  newsletter: NewsletterService;
  restock: RestockService;
  reviews: ReviewsService;
  audit: AuditService;
  seo: SeoService;
  health: HealthService;
  customerAuth: CustomerAuthService;
  ai: AiService;
  facets: FacetsService;
  withdrawal: WithdrawalService;
}

export interface Container {
  config: AppConfig;
  logger: Logger;
  client: CommerceClient;
  dataSource: 'shopify' | 'fixture';
  publisher: RealtimePublisher;
  services: Services;
  warnings: string[];
}

export function createContainer(
  config: AppConfig,
  logger: Logger,
  client: CommerceClient,
  dataSource: 'shopify' | 'fixture',
  publisher: RealtimePublisher = noopPublisher,
): Container {
  const warnings = [...config.warnings];
  if (dataSource === 'fixture') {
    warnings.unshift(
      'FIXTURE MODE IS ACTIVE: every response is generated from hand-authored mocks, not live Shopify data.',
    );
  }

  const cartService = new CartService(client);
  const restockStore = createRestockStore(config.restock.signupTtlSeconds);

  return {
    config,
    logger,
    client,
    dataSource,
    publisher,
    warnings,
    services: {
      products: new ProductsService(client, config),
      collections: new CollectionsService(client, config),
      search: new SearchService(client, config),
      cart: cartService,
      localization: new LocalizationService(client, config),
      shipping: new ShippingService(client, config),
      policies: new PoliciesService(client),
      newsletter: new NewsletterService(config, logger),
      restock: new RestockService(config, logger, client, restockStore),
      reviews: new ReviewsService(client, config, logger),
      audit: new AuditService(client, config, logger),
      seo: new SeoService(client, config),
      health: new HealthService(client, config),
      customerAuth: new CustomerAuthService(config, logger, cartService),
      ai: new AiService(config, logger),
      facets: new FacetsService(client, config),
      withdrawal: new WithdrawalService(config, logger),
    },
  };
}

