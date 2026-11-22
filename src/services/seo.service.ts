import type { AppConfig } from '../config/env';
import type {
  BreadcrumbItem,
  CollectionSummary,
  CommerceClient,
  MarketContext,
  PageMetadata,
  Product,
  RobotsData,
  SitemapData,
  SitemapEntry,
} from '../types/domain';
import { notFound } from '../utils/errors';
import { stripHtml, truncate } from '../utils/html';

const ROBOTS_INDEX = 'index,follow,max-image-preview:large';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * SEO preparation only: metadata, canonical URLs, JSON-LD and sitemap/robots
 * data. Prerendering/SSG itself is a frontend concern (docs/seo-strategy.md).
 */
export class SeoService {
  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
  ) {}

  async productMetadata(handle: string, ctx?: MarketContext): Promise<PageMetadata> {
    const product = await this.client.getProductByHandle(handle, ctx);
    if (!product) throw notFound('Product', handle);

    const title = product.seo.title?.trim() || `${product.title} | ${this.config.siteName}`;
    const description =
      product.seo.description?.trim() ||
      truncate(stripHtml(product.description), 155) ||
      `${product.title} from ${this.config.siteName}.`;
    const canonicalUrl = `${this.config.siteUrl}/products/${product.handle}`;
    const image = product.featuredImage?.url ?? null;

    return {
      title,
      description,
      canonicalUrl,
      robots: ROBOTS_INDEX,
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: 'product',
        image,
      },
      twitter: { card: 'summary_large_image', title, description, image },
      jsonLd: [
        this.organizationJsonLd(),
        this.productJsonLd(product, canonicalUrl),
        this.breadcrumbJsonLd([
          { name: 'Home', url: `${this.config.siteUrl}/` },
          { name: 'Products', url: `${this.config.siteUrl}/products` },
          { name: product.title, url: canonicalUrl },
        ]),
      ],
    };
  }

  async collectionMetadata(handle: string, ctx?: MarketContext): Promise<PageMetadata> {
    const collection = await this.client.getCollectionByHandle(handle, {
      first: 1,
      country: ctx?.country,
      language: ctx?.language,
    });
    if (!collection) throw notFound('Collection', handle);

    const title = collection.seo.title?.trim() || `${collection.title} | ${this.config.siteName}`;
    const description =
      collection.seo.description?.trim() ||
      truncate(stripHtml(collection.description), 155) ||
      `${collection.title} from ${this.config.siteName}.`;
    const canonicalUrl = `${this.config.siteUrl}/collections/${collection.handle}`;
    const image = collection.image?.url ?? null;

    return {
      title,
      description,
      canonicalUrl,
      robots: ROBOTS_INDEX,
      openGraph: { title, description, url: canonicalUrl, type: 'website', image },
      twitter: { card: 'summary_large_image', title, description, image },
      jsonLd: [
        this.organizationJsonLd(),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: collection.title,
          description,
          url: canonicalUrl,
        },
        this.breadcrumbJsonLd([
          { name: 'Home', url: `${this.config.siteUrl}/` },
          { name: 'Collections', url: `${this.config.siteUrl}/collections` },
          { name: collection.title, url: canonicalUrl },
        ]),
      ],
    };
  }

  async pageMetadata(handle: string): Promise<PageMetadata> {
    let pages = await this.client.getPages(`handle:${handle}`, 1);
    let page = pages.find((entry) => entry.handle === handle);
    if (!page) {
      // The Storefront search syntax does not guarantee `handle:` filters.
      pages = await this.client.getPages('', 100);
      page = pages.find((entry) => entry.handle === handle);
    }
    if (!page) throw notFound('Page', handle);

    const canonicalUrl = `${this.config.siteUrl}/pages/${page.handle}`;
    const title = `${page.title} | ${this.config.siteName}`;
    const description = truncate(stripHtml(page.bodySummary || page.body), 155) || title;

    return {
      title,
      description,
      canonicalUrl,
      robots: ROBOTS_INDEX,
      openGraph: { title, description, url: canonicalUrl, type: 'article', image: null },
      twitter: { card: 'summary', title, description, image: null },
      jsonLd: [
        this.organizationJsonLd(),
        this.breadcrumbJsonLd([
          { name: 'Home', url: `${this.config.siteUrl}/` },
          { name: page.title, url: canonicalUrl },
        ]),
      ],
    };
  }

  async sitemap(limit = 250): Promise<SitemapData> {
    const entries: SitemapEntry[] = [
      {
        url: `${this.config.siteUrl}/`,
        lastModified: null,
        changeFrequency: 'daily',
        priority: 1,
      },
    ];
    const notes: string[] = [];
    let truncated = false;

    const products: Product[] = [];
    let after: string | undefined;
    while (products.length < limit) {
      const page = await this.client.listProducts({
        first: Math.min(100, limit - products.length),
        after,
        sortKey: 'TITLE',
        reverse: false,
      });
      products.push(...page.items);
      if (products.length >= limit) {
        truncated = page.pageInfo.hasNextPage;
        break;
      }
      if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
      after = page.pageInfo.endCursor;
    }

    for (const product of products) {
      const url = this.canonicalSitemapUrl(product.url, `/products/${product.handle}`);
      entries.push({
        url,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    const collections: CollectionSummary[] = [];
    let collectionsAfter: string | undefined;
    do {
      const page = await this.client.listCollections({ first: 100, after: collectionsAfter });
      collections.push(...page.items);
      collectionsAfter = page.pageInfo.hasNextPage ? page.pageInfo.endCursor ?? undefined : undefined;
    } while (collectionsAfter);

    for (const collection of collections) {
      const url = this.canonicalSitemapUrl(collection.url, `/collections/${collection.handle}`);
      entries.push({
        url,
        lastModified: collection.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // Shopify pages and policies are either hosted on the myshopify domain or
    // use legacy `/pages/*` / `/policies/*` paths that the SPA no longer routes.
    // The storefront redirects those URLs (see render.yaml), so they must never
    // appear in a sitemap that search engines use for canonical URL discovery.
    notes.push(
      'Legacy Shopify pages and policies are excluded; storefront routes are listed in /sitemap.xml.',
    );

    if (truncated) {
      notes.push(
        `Product entries truncated at ${limit}. Increase the limit or generate the sitemap at build time for the full catalog.`,
      );
    }
    if (this.config.shopify.useFixtures) {
      notes.push('FIXTURE MODE: sitemap entries are mocked (fixtures.invalid images, sandbox URLs).');
    }

    return {
      baseUrl: this.config.siteUrl,
      generatedAt: new Date().toISOString(),
      entries,
      truncated,
      notes,
    };
  }

  robots(): RobotsData {
    return {
      baseUrl: this.config.siteUrl,
      rules: [
        {
          userAgent: '*',
          allow: ['/'],
          disallow: ['/api/', '/cart', '/checkout', '/account', '/search?'],
        },
      ],
      sitemaps: [`${this.config.siteUrl}/sitemap.xml`],
      host: this.config.siteUrl,
    };
  }

  /** Rewrite Shopify-provided URLs to the canonical storefront host. */
  private canonicalSitemapUrl(raw: string, fallbackPath: string): string {
    const base = this.config.siteUrl.replace(/\/+$/, '');
    if (!raw) return `${base}${fallbackPath}`;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return `${base}${fallbackPath}`;
      }
      return `${base}${parsed.pathname}`;
    } catch {
      return `${base}${fallbackPath}`;
    }
  }

  sitemapXml(data: SitemapData): string {
    const urls = data.entries
      .map(
        (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
${entry.lastModified ? `    <lastmod>${escapeXml(entry.lastModified)}</lastmod>\n` : ''}    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`,
      )
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  }

  robotsTxt(data: RobotsData): string {
    const lines: string[] = ['# Generated by BeNa Origins backend (data only; serve from the storefront)'];
    for (const rule of data.rules) {
      lines.push(`User-agent: ${rule.userAgent}`);
      for (const allow of rule.allow) lines.push(`Allow: ${allow}`);
      for (const disallow of rule.disallow) lines.push(`Disallow: ${disallow}`);
      lines.push('');
    }
    for (const sitemap of data.sitemaps) lines.push(`Sitemap: ${sitemap}`);
    lines.push(`Host: ${data.host}`);
    return `${lines.join('\n')}\n`;
  }

  private organizationJsonLd(): Record<string, unknown> {
    const shop = this.config.siteUrl;
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.config.siteName,
      url: shop,
    };
  }

  private breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  private productJsonLd(product: Product, canonicalUrl: string): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: truncate(stripHtml(product.description), 500),
      url: canonicalUrl,
      sku: product.variants[0]?.sku ?? undefined,
      image: product.images.map((image) => image.url),
      brand: { '@type': 'Brand', name: this.config.siteName },
      category: product.productType || undefined,
      offers: product.variants.map((variant) => ({
        '@type': 'Offer',
        sku: variant.sku ?? undefined,
        url: `${canonicalUrl}?variant=${variant.id.split('/').pop()}`,
        priceCurrency: variant.price.currencyCode,
        price: variant.price.amount,
        availability: variant.availableForSale
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      })),
    };
  }
}
