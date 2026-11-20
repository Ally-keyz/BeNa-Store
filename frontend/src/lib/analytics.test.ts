import { afterEach, describe, expect, it } from 'vitest';
import { getAnalyticsEvents, setAnalyticsEnabled, trackEvent } from './analytics';

afterEach(() => {
  setAnalyticsEnabled(false);
});

describe('consent-gated analytics', () => {
  it('drops events until analytics consent is granted', () => {
    trackEvent('page_view', { path: '/catalog' });
    expect(getAnalyticsEvents()).toEqual([]);

    setAnalyticsEnabled(true);
    trackEvent('page_view', { path: '/catalog' });
    expect(getAnalyticsEvents()).toHaveLength(1);
    expect(getAnalyticsEvents()[0]).toMatchObject({
      name: 'page_view',
      properties: { path: '/catalog' },
    });
  });

  it('clears queued events as soon as consent is withdrawn', () => {
    setAnalyticsEnabled(true);
    trackEvent('add_to_cart', { quantity: 2 });
    expect(getAnalyticsEvents()).toHaveLength(1);

    setAnalyticsEnabled(false);
    expect(getAnalyticsEvents()).toEqual([]);
    trackEvent('add_to_cart', { quantity: 1 });
    expect(getAnalyticsEvents()).toEqual([]);
  });
});
