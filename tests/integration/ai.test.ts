import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';
import { fixtureProducts } from '../../src/fixtures/mock/data';

const handle = fixtureProducts[0]!.handle;

function stubProvider() {
  const content = JSON.stringify({
    ingredients: { value: 'Roasted coffee', confidence: 0.8, rationale: 'Title mentions coffee.' },
  });
  const fetchMock = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AI suggestions route', () => {
  it('stays hidden without an API key and needs no admin credentials', async () => {
    const { app } = buildTestContext();
    const disabled = await request(app).get(`/api/v1/ai/suggestions/${handle}`);
    expect(disabled.status).toBe(503);
    expect(disabled.body.error.code).toBe('FEATURE_DISABLED');

    const fetchMock = stubProvider();
    const enabled = buildTestContext({ AI_API_KEY: 'test-key' });
    const response = await request(enabled.app).get(`/api/v1/ai/suggestions/${handle}`);
    expect(response.status).toBe(200);
    expect(response.body.data.verified).toBe(false);
    expect(response.body.data.ingredients.value).toBe('Roasted coffee');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves repeat product views from the in-memory cache', async () => {
    const fetchMock = stubProvider();
    const { app } = buildTestContext({ AI_API_KEY: 'test-key' });
    const path = `/api/v1/ai/suggestions/${handle}`;

    expect((await request(app).get(path)).status).toBe(200);
    expect((await request(app).get(path)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect((await request(app).get(`${path}?refresh=true`)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
