import { afterEach, describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { AiService } from '../../src/services/ai.service';
import { testConfig } from '../helpers/testContext';
import { fixtureProducts } from '../../src/fixtures/mock/data';

const logger = pino({ level: 'silent' });
const product = fixtureProducts[0]!;

function modelPayload(overrides: Record<string, unknown> = {}) {
  return {
    ingredients: { value: 'Coffee beans', confidence: 0.9, rationale: 'Plausible from the title.' },
    allergens: { value: 'Contains fish', confidence: 0.4, rationale: 'Listed in the product description.' },
    nutrition: { value: 'Per 100 g: 2 kcal', confidence: 0.6, rationale: 'Typical for coffee.' },
    origin: { value: 'Rwanda', confidence: 0.8, rationale: 'Named in the title.' },
    preparation: { value: 'Brew with hot water', confidence: 0.7, rationale: 'Coffee product.' },
    ...overrides,
  };
}

function stubFetch(status = 200, payload = modelPayload()) {
  const body = JSON.stringify({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
  const fetchMock = vi.fn().mockImplementation(() =>
    Promise.resolve(new Response(body, { status, headers: { 'content-type': 'application/json' } })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AiService', () => {
  it('is disabled until an API key is configured', async () => {
    const service = new AiService(testConfig({ AI_API_KEY: '' }), logger);
    await expect(service.suggest(product)).rejects.toMatchObject({ code: 'FEATURE_DISABLED' });
  });

  it('calls one hosted model with a bearer key and returns unverified suggestions', async () => {
    const fetchMock = stubFetch();
    const service = new AiService(
      testConfig({ AI_API_KEY: 'test-key', AI_MODEL: 'test-model' }),
      logger,
    );
    const enriched = {
      ...product,
      metafields: {
        ...product.metafields,
        origin: { namespace: 'custom', key: 'origin', type: 'text', value: 'Rwanda' },
        preparation: { namespace: 'custom', key: 'preparation', type: 'text', value: 'Filter brew' },
      },
    };

    const result = await service.suggest(enriched);

    expect(result.verified).toBe(false);
    expect(result.needsReview).toBe(true);
    expect(result.model).toBe('test-model');
    expect(result.ingredients?.value).toBe('Coffee beans');
    expect(result.allergens?.confidence).toBe(0.4);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const request = JSON.parse(init.body as string);
    expect(request.response_format).toEqual({ type: 'json_object' });
    expect(request.max_completion_tokens).toBe(800);
    expect(request.max_tokens).toBeUndefined();
    expect(request.messages[1].content).toContain('Existing origin: Rwanda');
    expect(request.messages[1].content).not.toContain('[object Object]');
  });

  it('drops placeholder AI values instead of showing unspecified facts', async () => {
    stubFetch(
      200,
      modelPayload({
        allergens: { value: 'unspecified', confidence: 0.1, rationale: 'No data.' },
        nutrition: { value: 'N/A', confidence: 0.1, rationale: 'No data.' },
        origin: { value: 'Unknown', confidence: 0.1, rationale: 'No data.' },
      }),
    );
    const service = new AiService(testConfig({ AI_API_KEY: 'test-key' }), logger);

    const result = await service.suggest(product);

    expect(result.allergens).toBeNull();
    expect(result.nutrition).toBeNull();
    expect(result.origin).toBeNull();
    expect(result.ingredients?.value).toBe('Coffee beans');
  });

  it('caches results per product and bypasses the cache on refresh', async () => {
    const fetchMock = stubFetch();
    const service = new AiService(testConfig({ AI_API_KEY: 'test-key' }), logger);

    await service.suggest(product);
    await service.suggest(product);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await service.suggest(product, { refresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a rejected JSON-mode request with a plain prompt', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { message: 'JSON mode is unavailable' } }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(modelPayload()) } }] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const service = new AiService(testConfig({ AI_API_KEY: 'test-key' }), logger);

    const result = await service.suggest(product);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondInit] = fetchMock.mock.calls[1]!;
    const secondRequest = JSON.parse(secondInit!.body as string);
    expect(secondRequest.response_format).toBeUndefined();
    expect(secondRequest.temperature).toBeUndefined();
    expect(secondRequest.messages).toHaveLength(1);
    expect(result.ingredients?.value).toBe('Coffee beans');
  });

  it('includes provider rejection details in the error message', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { message: 'Model not found' } }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const service = new AiService(testConfig({ AI_API_KEY: 'test-key' }), logger);

    await expect(service.suggest(product)).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      message: expect.stringContaining('Model not found'),
    });
  });

  it('reports provider rate limits as upstream unavailable', async () => {
    stubFetch(429);
    const service = new AiService(testConfig({ AI_API_KEY: 'test-key' }), logger);
    await expect(service.suggest(product)).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
  });
});
