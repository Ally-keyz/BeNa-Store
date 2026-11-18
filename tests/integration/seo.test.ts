import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';

interface JsonLdEntry {
  '@type': string;
}

describe('SEO preparation endpoints', () => {
  it('returns product metadata, canonical URL and JSON-LD (Product, BreadcrumbList, Organization)', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/seo/product/rwanda-coffee-250g');
    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.canonicalUrl).toBe('https://benaorigins.de/products/rwanda-coffee-250g');
    expect(data.openGraph.type).toBe('product');
    expect(data.robots).toMatch(/index,follow/);
    const types = data.jsonLd.map((entry: JsonLdEntry) => entry['@type']);
    expect(types).toEqual(expect.arrayContaining(['Product', 'BreadcrumbList', 'Organization']));

    const product = data.jsonLd.find((entry: JsonLdEntry) => entry['@type'] === 'Product');
    expect(product.offers[0].priceCurrency).toBe('EUR');
    expect(product.offers[0].availability).toBe('https://schema.org/InStock');
  });

  it('returns collection and informational page metadata', async () => {
    const { app } = buildTestContext();
    const collection = await request(app).get('/api/v1/seo/collection/coffee');
    expect(collection.status).toBe(200);
    expect(collection.body.data.canonicalUrl).toBe(
      'https://benaorigins.de/collections/coffee',
    );

    const page = await request(app).get('/api/v1/seo/page/impressum');
    expect(page.status).toBe(200);
    expect(page.body.data.title).toContain('Impressum');
    const breadcrumb = page.body.data.jsonLd.find(
      (entry: JsonLdEntry) => entry['@type'] === 'BreadcrumbList',
    );
    expect(breadcrumb.itemListElement.length).toBe(2);
  });

  it('returns sitemap data and XML', async () => {
    const { app } = buildTestContext();
    const data = await request(app).get('/api/v1/seo/sitemap?limit=100');
    expect(data.status).toBe(200);
    const urls = data.body.data.entries.map((entry: { url: string }) => entry.url);
    expect(urls).toContain('https://benaorigins.de/');
    expect(urls).toContain('https://benaorigins.de/products/rwanda-coffee-250g');
    expect(urls).toContain('https://benaorigins.de/collections/coffee');
    expect(data.body.data.notes.join(' ')).toMatch(/FIXTURE MODE/);

    const xml = await request(app).get('/api/v1/seo/sitemap.xml?limit=100');
    expect(xml.status).toBe(200);
    expect(xml.headers['content-type']).toMatch(/application\/xml/);
    expect(xml.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml.text).toContain('<loc>https://benaorigins.de/products/rwanda-coffee-250g</loc>');
  });

  it('returns robots data and robots.txt', async () => {
    const { app } = buildTestContext();
    const data = await request(app).get('/api/v1/seo/robots');
    expect(data.status).toBe(200);
    expect(data.body.data.sitemaps).toEqual(['https://benaorigins.de/sitemap.xml']);

    const txt = await request(app).get('/api/v1/seo/robots.txt');
    expect(txt.status).toBe(200);
    expect(txt.text).toContain('Sitemap: https://benaorigins.de/sitemap.xml');
    expect(txt.headers['content-type']).toMatch(/text\/plain/);
  });
});
